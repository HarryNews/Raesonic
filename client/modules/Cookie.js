var Cookie = {}

// Read a cookie with the specified name, and return the value of it
// If the cookie does not exist, default value will be returned
Cookie.get = function(name, defaultValue)
{
	var value = $.cookie(name);

	if(typeof value == "undefined")
		return defaultValue;
	
	return JSON.parse(value);
}

// Set value of a cookie with the specified name
Cookie.set = function(name, value)
{
	$.cookie(name, value);
}

$.cookie.defaults.path = "/";

module.exports = Cookie;
