# Fast CSV reader

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/marketzredcuy/makefun-csv-reader-speed/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/marketzredcuy/makefun-csv-reader-speed/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for [make.fun's csv-reader 1.0.0](https://make.fun/bounty/csv-reader-speed-01-run-20261121): it returns exactly the same answer for every input, but reads the text in a single pass with indexOf fast paths and slices instead of building every field one character at a time.

## How it works

- Unquoted fields are scanned with a tight `charCodeAt` loop to the next comma or line break, then sliced once. No per-character string building.
- Quoted fields find their closing quote with `indexOf`, skipping doubled quotes, and slice the content in one piece when it holds no line break.
- Broken rows follow csv-reader's policy exactly: a stray CR outside quotes is dropped (`stray_cr`), characters after a closing quote are appended as they stand (`quote_junk`), a quote that never closes is read again as unquoted (`unterminated_quote`), short rows are padded and long rows cut (`short_row` / `long_row`).
- The entry is pure and deterministic: the same input always gives the same answer, byte for byte.

## Run it

```sh
node main.ts
```

It reads every case from `MAKEFUN_INPUT_DIR/cases.json` (or `/input/cases.json`) and writes `answers.json` to `MAKEFUN_OUTPUT_DIR` (or `/output`). Node 22 or later, standard library only.

## Files

- `solve.js` — the reader: `run(input)` returns `{columns, rows, errors}` exactly as csv-reader 1.0.0 does
- `main.ts` — the driver the harness runs (kept from the house baseline, including `--no-incremental-marking`)

## License

MIT. See `LICENSE`.
