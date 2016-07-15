var Local = {}

// Retrieve local storage value
Local.get = function(name, defaultValue)
{
	// Local storage not supported, bail out with default value
	if(typeof(Storage) == "undefined")
		return defaultValue;

	var value = localStorage.getItem(name);

	if(value == null)
		return defaultValue;
	
	return JSON.parse(value);
}

// Store local storage value
Local.set = function(name, value)
{
	// Local storage not supported, bail out
	if(typeof(Storage) == "undefined")
		return;

	var Account = require("./Account.js");

	// Don't store anything when not authenticated, unless the
	// storage already has items in it, which would mean the consent
	// to use local storage has been provided upon sign up
	if( !Account.authenticated &&
		localStorage.length == 0 )
			return;

	localStorage.setItem(name, value);
}

module.exports = Local;
