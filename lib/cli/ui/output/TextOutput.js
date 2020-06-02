class TextOutput {
  static show(text = "") {
    process.stdout.write(text + "\r\n");
  }

  static addNewLine() {
    process.stdout.write("\r\n");
  }
}

module.exports = TextOutput;
