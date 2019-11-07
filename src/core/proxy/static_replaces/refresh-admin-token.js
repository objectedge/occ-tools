define('OE-REFRESH-ADMIN-TOKEN', ['jquery'], function ($) {
    var refresh = function () {
      require(['/shared/js/ccLibs/admin-rest-client.js?' + new Date().getUTCMilliseconds(), 'ccRestClient'], function(client, CCRestClient) {
        var url = '/ccadminui/v1/refresh';

        var successFunc = function(pResult) {
          client.tokenSecret = pResult.access_token;
          client.parseAndStoreClaims();
          client.storeToken(client.tokenSecret);
          client.loggedIn = true;
          console.log('token refreshed');
        };
        var errorFunc = function(pResult) {
          console.log('error', pResult);
        };

        if(client.tokenSecret) {
          var obj = {
            dataType: "json", 
            contentType: "application/json", 
            type: "POST", 
            url: url, 
            processData: false,
            beforeSend: undefined,
            data: "{}",
            error: errorFunc,
            headers: {
              "X-CCProfileType": "adminUI",
              "Authorization": "Bearer " + client.tokenSecret
            },
            success: successFunc
          };

          $.ajax(obj);
        } else {
          errorFunc();
        }
      });
    };

    if(/ccadmin/.test(window.location.href)) {
      refresh();
      setInterval(refresh, 60000);
    }
});

require(['OE-REFRESH-ADMIN-TOKEN']);
