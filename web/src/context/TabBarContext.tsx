import { createContext, useContext } from 'react';

const TabBarContext = createContext({
  handleScroll: (_e?: unknown) => {},
  handleScrollEnd: (_e?: unknown) => {},
});

export const useTabBar = () => useContext(TabBarContext);