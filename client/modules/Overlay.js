var Overlay = {};

// Create and show an overlay
Overlay.create = function(name, elements, done)
{
	var $elements =
	[
		$("<button>")
			.attr("id", "window-button")
			.click(Overlay.onActionClick),
		$("<div>")
			.attr("id", "window-header")
			.text(name),
	];

	for(var index in elements)
	{
		var data = elements[index];
		var $element = Overlay.createElement(data);
		$elements.push($element);
	}

	// Add elements to the window
	$("#window")
		.empty()
		.append($elements);

	// Add spacer element
	$("#window input:last-of-type").after(
		$("<div>").attr("id", "window-separator")
	);

	// Call the callback function
	done();

	// Display the overlay
	$("#overlay")
		.hide()
		.removeClass("hidden")
		.fadeIn(200);
}

Overlay.createElement = function(data)
{
	var $element = $(data.tag).attr(data.attributes);

	delete data.tag;
	delete data.attributes;

	for(var method in data)
		$element[method]( data[method] );

	return $element;
}

// Changes the button text and configures the click action
Overlay.setAction = function(name, onClick)
{
	$("#window-button")
		.text(name || "")
		.toggleClass("disabled", typeof onClick != "function");

	Overlay.action = onClick;
}

// Returns true if the overlay is in use
Overlay.isActive = function()
{
	return !$("#overlay").is(".hidden");
}

// Flags an input field with an error message
Overlay.setError = function(elementId, message)
{
	// Remove previous error element if it exists
	$(elementId + " + .input-error").remove();

	// Add a new error element with provided message
	$(elementId)
		.addClass("error")
		.after(
			$("<div>")
				.addClass("input-error")
				.text(message)
		);
}

// Returns true if there is at least one error
Overlay.hasErrors = function()
{
	return ( $("#window .input-error").length > 0 );
}

// Removes all errors
Overlay.clearErrors = function()
{
	$("#window input").removeClass("error");
	$("#window .input-error").remove();
}

// Hides the overlay and clears the window
Overlay.destroy = function()
{
	$("#overlay").fadeOut(200, function onOverlayFadeOut()
	{
		$(this).addClass("hidden");
		$("#window").empty();
	});
}

// Called upon clicking the action button
Overlay.onActionClick = function()
{
	if(typeof Overlay.action != "function")
		return;

	Overlay.action();
};

// Called when the one-use action has been completed
Overlay.onActionComplete = function(message, onClick)
{
	Overlay.setAction(message, onClick);
}

// Called upon clicking the overlay
Overlay.onClick = function(event)
{
	// The click wasn't outside the window
	if(event.target != this)
		return;

	Overlay.destroy();
}

Overlay.init = function()
{
	$("#overlay").click(Overlay.onClick);
}

module.exports = Overlay;
