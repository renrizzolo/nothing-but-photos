"use client";
import * as React from "react";
type Coords = [number, number];
type AId = string | null;
export interface GridContextProps {
  setInitialCoords: (coords: Coords) => void;
  initialCoords: Coords;
  setActiveId: (id: AId) => void;
  activeId: AId;
}

const GridContext = React.createContext<GridContextProps>({
  setInitialCoords: () => {},
  initialCoords: [0, 0],
  setActiveId: () => {},
  activeId: null,
});

export const GridProvider = ({ children }: React.PropsWithChildren) => {
  const [initialCoords, setInitialCoords] = React.useState<Coords>([0, 0]);
  const [activeId, setActiveId] = React.useState<AId>(null);

  return (
    <GridContext.Provider
      value={{ setInitialCoords, initialCoords, activeId, setActiveId }}
    >
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = () => React.useContext(GridContext);
