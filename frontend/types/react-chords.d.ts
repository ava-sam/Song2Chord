declare module "@tombatossals/react-chords/lib/Chord" {
  import { ComponentType } from "react";

  interface ChordData {
    frets: number[];
    fingers: number[];
    baseFret: number;
    barres: number[];
    capo?: boolean;
  }

  interface Instrument {
    strings: number;
    fretsOnChord: number;
    name: string;
    tunings: { standard: string[] };
  }

  interface ChordProps {
    chord: ChordData;
    instrument: Instrument;
    lite?: boolean;
  }

  const Chord: ComponentType<ChordProps>;
  export default Chord;
}
