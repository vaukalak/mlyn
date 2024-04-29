module.exports = {
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "^components/(.*)": "<rootDir>/src/components/$1",
  },
  testEnvironment: "jsdom",
//   setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
};
