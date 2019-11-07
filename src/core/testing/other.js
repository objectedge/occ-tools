var Nightmare = require('nightmare'),
  nightmare = Nightmare({
    show: false
  });

nightmare.viewport(1920, 956).goto('http://google.com')
  .wait()
  .screenshot('google.png')
  .run(function(){
    console.log('Done!')
  });
