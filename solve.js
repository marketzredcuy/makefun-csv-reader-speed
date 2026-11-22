// Variant V2: charCodeAt loop for unquoted fields (slice at delimiters), indexOf for quoted.
// Same semantics as solve.js.
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;
  if (len > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;
  let recordLine = 1;
  let recordRow = null;

  // Unquoted field from pos. prefix prepended to the value.
  function readUnquoted(prefix) {
    const start = pos;
    let p = pos;
    let added = 0;
    // Fast scan: charCodeAt loop to the next delimiter.
    while (p < len) {
      const c = text.charCodeAt(p);
      if (c === 44) {
        const value = prefix + text.slice(start, p);
        pos = p + 1;
        return { value, ended: COMMA, added: p - start };
      }
      if (c === 10) {
        const value = prefix + text.slice(start, p);
        pos = p + 1;
        line += 1;
        return { value, ended: LINE_BREAK, added: p - start };
      }
      if (c === 13) {
        if (text.charCodeAt(p + 1) === 10) {
          const value = prefix + text.slice(start, p);
          pos = p + 2;
          line += 1;
          return { value, ended: LINE_BREAK, added: p - start };
        }
        // Stray CR: fall to the slow path from the field start.
        break;
      }
      p++;
    }
    if (p >= len) {
      const value = prefix + text.slice(start, len);
      pos = len;
      return { value, ended: END, added: len - start };
    }
    // Slow path: a stray CR was found at p. Scan from start, dropping stray
    // CRs (an error each) and stopping at a CRLF (line break) or the end.
    const parts = [prefix];
    added = 0;
    let seg = start;
    let q = start;
    let ended = END;
    while (q < len) {
      const c = text.charCodeAt(q);
      if (c === 44) {
        ended = COMMA;
        break;
      }
      if (c === 10) {
        ended = LINE_BREAK;
        break;
      }
      if (c === 13) {
        if (text.charCodeAt(q + 1) === 10) {
          ended = LINE_BREAK;
          break;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        if (seg < q) {
          parts.push(text.slice(seg, q));
          added += q - seg;
        }
        q++;
        seg = q;
        continue;
      }
      q++;
    }
    if (seg < q) {
      parts.push(text.slice(seg, q));
      added += q - seg;
    }
    if (ended === COMMA) pos = q + 1;
    else if (ended === LINE_BREAK) {
      // q is at \n, or at \r of a CRLF.
      if (text.charCodeAt(q) === 13) pos = q + 2;
      else pos = q + 1;
      line += 1;
    } else {
      pos = len;
    }
    return { value: parts.join(''), ended, added };
  }

  function readQuoted() {
    const open = pos;
    const openLine = line;
    let q = text.indexOf('"', open + 1);
    let doubled = false;
    while (q !== -1) {
      if (text.charCodeAt(q + 1) === 34) {
        doubled = true;
        q = text.indexOf('"', q + 2);
      } else {
        break;
      }
    }
    if (q === -1) {
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    const closeQ = q;
    let value;
    if (!doubled) {
      // Slice first, then check the slice itself for a newline or CR: the
      // check stays inside the field instead of scanning past its end.
      const cand = text.slice(open + 1, closeQ);
      if (cand.indexOf('\n') === -1 && cand.indexOf('\r') === -1) {
        value = cand;
      } else {
        value = null;
      }
    }
    if (value === undefined || value === null) {
      const parts = [];
      let p = open + 1;
      while (p < closeQ) {
        const c = text.charCodeAt(p);
        if (c === 34) {
          parts.push('"');
          p += 2;
        } else if (c === 13) {
          parts.push('\n');
          line += 1;
          p += text.charCodeAt(p + 1) === 10 ? 2 : 1;
        } else if (c === 10) {
          parts.push('\n');
          line += 1;
          p += 1;
        } else {
          let nq = text.indexOf('"', p);
          let nr = text.indexOf('\r', p);
          let nn = text.indexOf('\n', p);
          if (nq === -1 || nq >= closeQ) nq = closeQ;
          if (nr === -1 || nr >= closeQ) nr = closeQ;
          if (nn === -1 || nn >= closeQ) nn = closeQ;
          const next = nq < nr ? (nq < nn ? nq : nn) : (nr < nn ? nr : nn);
          parts.push(text.slice(p, next));
          p = next;
        }
      }
      value = parts.join('');
    }
    pos = closeQ + 1;
    if (pos >= len) return { value, ended: END };
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      return { value, ended: COMMA };
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    const junk = readUnquoted(value);
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return junk;
  }

  while (true) {
    let c = pos < len ? text.charCodeAt(pos) : -1;
    while (c === 10 || (c === 13 && text.charCodeAt(pos + 1) === 10)) {
      if (c === 10) {
        pos += 1;
        line += 1;
      } else {
        pos += 2;
        line += 1;
      }
      c = pos < len ? text.charCodeAt(pos) : -1;
    }
    if (pos >= len) break;
    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
