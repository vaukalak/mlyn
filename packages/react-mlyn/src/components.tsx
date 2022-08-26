/**
 * partially taken from https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/array.ts
 */
import React, { useMemo } from "react";
import { seal } from "./utils";
import { useCompute, useObervableValue } from "./hooks";
import { createSubject, runInReactiveScope, Subject } from "mlyn";

interface ShowProps {
  when: () => any;
  children: () => React.ReactElement;
  falldown?: () => React.ReactElement;
}

export const Show = seal(({ when, children, falldown }: ShowProps) => {
  const visible = useCompute(() => Boolean(when()));
  return visible ? children() : falldown ? falldown() : null;
});

interface Props<T> {
  noBindBack?: boolean;
  each: Subject<T[]>;
  getKey?: (item: T, index: number) => string;
  children(item: Subject<T>, index: Subject<number>): React.ReactElement;
}

let uniqueKey = 0;

export const For = seal(<T extends any>(props: Props<T>) => {
  const { each, children, noBindBack, getKey } = props;
  const bindBack = !noBindBack;
  const updateClosure = useMemo(() => {
    let renderItems = [];
    let prevItems = [];
    let rendering = false;
    return () => {
      rendering = true;
      const newItems = each();
      let suffix = [];

      let changesStart: number;
      let end;
      let changesEnd;
      const prevLen = prevItems.length;
      const newLen = newItems.length;
      if (newLen === 0) {
        if (bindBack) {
          renderItems.forEach((entry) => entry.backScope.destroy());
        }
        renderItems = [];
      } else if (prevLen === 0) {
        renderItems = [];
        for (let i = 0; i < newLen; i++) {
          const subj$ = createSubject(newItems[i]);
          const index$ = createSubject(i);
          renderItems.push({
            subj$,
            index$,
            Item: seal(() => children(subj$, index$)),
            // @ts-ignore
            key: getKey ? getKey(subj$.__value, index$.__value) : ++uniqueKey,
            backScope:
              bindBack &&
              runInReactiveScope(() => {
                const newValue = subj$();
                if (!rendering) {
                  // @ts-ignore
                  each[index$.__value](newValue);
                }
              }),
          });
        }
      } else if (prevLen !== newLen) {
        for (
          changesStart = 0, end = Math.min(prevLen, newLen);
          changesStart < end &&
          prevItems[changesStart] === newItems[changesStart];
          changesStart++
        );

        // common suffix
        for (
          end = prevLen - 1, changesEnd = newLen - 1;
          end >= changesStart &&
          changesEnd >= changesStart &&
          prevItems[end] === newItems[changesEnd];
          end--, changesEnd--
        ) {}
        suffix = renderItems.slice(end + 1);

        const midStart = changesStart + 1;
        const mid = renderItems.slice(midStart, -suffix.length);
        const newMidEnd = newLen - suffix.length;
        const prevMidEnd = prevLen - suffix.length;
        // dispose scopes for bind back items
        if (bindBack) {
          for (let i = newMidEnd; i < prevMidEnd; i++) {
            renderItems[i].backScope.destroy();
          }
        }
        let itemsIndex;
        for (let i = changesStart; i < newMidEnd; i++) {
          let j = i - changesStart;
          if (j >= mid.length) {
            const subj$ = createSubject(newItems[i]);
            const index$ = createSubject(i);
            mid[j] = {
              subj$,
              index$,
              Item: seal(() => children(subj$, index$)),
              // @ts-ignore
              key: getKey ? getKey(subj$.__value, index$.__value) : ++uniqueKey,
              backScope:
                bindBack &&
                runInReactiveScope(() => {
                  const newValue = subj$();
                  if (!rendering) {
                    // @ts-ignore
                    each[index$.__value](newValue);
                  }
                }),
            };
          } else {
            // @ts-ignore
            if (mid[j].subj$.__curried !== newItems[j]) {
              if (getKey) {
                const newKey = getKey(newItems[j], j);
                if (mid[j].key !== newKey) {
                  // if item by this key exists just reuse it.
                  if (!itemsIndex) {
                    itemsIndex = {};
                    renderItems.forEach((item) => {
                      itemsIndex[item.key] = item;
                    });
                  }
                  const itemByKey = itemsIndex[newKey];
                  if (itemByKey) {
                    mid[j] = itemByKey;
                  } else {
                    // item not found
                    mid[j].key = newKey;
                  }
                  mid[j].subj$(newItems[j]);
                } else {
                  mid[j].subj$(newItems[j]);
                }
              } else {
                mid[j].subj$(newItems[j]);
              }
            }
          }
        }

        if (changesStart > 0) {
          renderItems = renderItems.slice(0, changesStart).concat(mid, suffix);
        } else {
          renderItems = mid.concat(suffix);
        }

        // update indexes for suffix
        for (let i = newMidEnd; i < newLen; i++) {
          renderItems[i].index$(i);
        }
      } else {
        const prevRenderItems = renderItems;
        const index = {};
        // len is not changed, just update
        for (let i = 0; i < newLen; i++) {
          // @ts-ignore
          if (renderItems[i].subj$.__value !== newItems[i]) {
            if (getKey) {
              const newKey = getKey(newItems[i], i);
              if (renderItems[i].key !== newKey) {
                // we need to clone to re-render, and for swapping scenarios
                if (prevRenderItems === renderItems) {
                  prevRenderItems.forEach((item) => {
                    index[item.key] = item;
                  });
                  renderItems = prevRenderItems.concat();
                }
                // if item by this key exists just reuse it.
                const itemByKey = index[newKey];
                if (itemByKey) {
                  renderItems[i] = itemByKey;
                } else {
                  // item not found
                  renderItems[i].key = newKey;
                }
                renderItems[i].subj$(newItems[i]);
              } else {
                renderItems[i].subj$(newItems[i]);
              }
            } else {
              renderItems[i].subj$(newItems[i]);
            }
          }
        }
      }
      rendering = false;
      prevItems = newItems;
      return renderItems;
    };
  }, []);
  const items = useObervableValue(updateClosure);
  return (
    <>
      {items.map(({ Item, key }) => (
        <Item key={key} />
      ))}
    </>
  );
});
