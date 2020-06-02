const CliTable = require("cli-table3");

class Table {
  constructor(head, records) {
    this._records = records;

    this._table = new CliTable({
      head,
      style: { head: ["bold"] },
    });

    Array.prototype.push.apply(this._table, records);
  }

  show() {
    process.stdout.write(this._table.toString() + "\r\n");
  }
}

module.exports = Table;
