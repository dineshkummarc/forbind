// a dummy io file to allow Förbind to load and get the version out
(function () {
  var io = { Socket: function () {}, setPath: function () {} };
  if (typeof exports !== 'undefined') exports.io = io;
  this.io = io;
})();
