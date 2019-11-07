module.exports = {
  action: function(subcmd, opts, args, cb) {
    console.log('This is a sample command');
    cb()
  },
  help:(
    'Log a sample text command\n\n' +
    'Usage:\n' +
    '     {{name}} {{cmd}} [options] \n\n' +
    '{{options}}'
  ),
  options: [
    {
      names: ['sampleOption', 'so'],
      helpArg: '[sampleOption]',
      type: 'bool',
      help: '(Optional) Test'
    }
  ]
};