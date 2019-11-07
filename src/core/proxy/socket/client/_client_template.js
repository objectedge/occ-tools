//Event #event
occProxyIO.on("#event", function (data) {
  occProxyIO.emit("#event-client-pre", #data);
  var proxyFN = #fn;

  if(typeof $ !== 'undefined' && $.fn) {
    $(proxyFN.bind(null, data));
  } else {
    require(['jquery'], proxyFN.bind(null, data));
  }

  occProxyIO.emit("#event-client-post", #data);
});
