var Local = {}

// Retrieve local storage value
Local.get = function(name, defaultValue)
{
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
	if(typeof(Storage) == "undefined")
		return;

	localStorage.setItem(name, value);
}

module.exports = Local;
