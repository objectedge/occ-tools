function Completion(subcmd, opts, args, callback) {
  if (opts.help) {
    this.do_help('help', {}, [subcmd], callback);
    return;
  }

  console.log(this.bashCompletion());
  callback();
}

Completion.options = [
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Show this help.'
  }
];

Completion.help = [
  'Output bash completion. See help output for installation.',
  '',
  'Installation:',
  '    {{name}} completion > /usr/local/etc/bash_completion.d/{{name}} # Mac',
  '    sudo {{name}} completion > /etc/bash_completion.d/{{name}} # Linux',
  '',
  'Alternative installation:',
  '    {{name}} completion > ~/.{{name}}.completion',
  '    echo "source ~/.{{name}}.completion" >> ~/.bashrc',
  '',
  '{{options}}'
].join('\n');

module.exports = Completion;
