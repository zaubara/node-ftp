const { assert} = require('chai');

describe('#Ftp Parser', () => {
  const { parseListEntry } = require('../lib/parser');
  const entires = require('./assets/entries');

  it('should no exception while parsing', () => {
    entires.forEach((entry) => {
      const result = parseListEntry(entry.source);

      assert.deepEqual(result, entry.expected);
    });
  });
});
