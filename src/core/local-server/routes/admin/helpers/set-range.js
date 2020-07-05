module.exports = (req, res) => {
  if(!isNaN(req.range.first) && !isNaN(req.range.last) && !isNaN(req.range.length)) {
    res.range({
      first: req.range.first,
      last: req.range.last,
      length: req.range.length
    });
  }
};
