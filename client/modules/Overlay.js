var Overlay = {};

// Create and show an overlay
Overlay.create = function(name, elements, options, done)
{
	if(typeof done == "undefined")
	{
		done = options;
		options = {};
	}

	var Article = require("./Article.js");
	Article.destroy();

	var $elements =
	[
		$("<button>")
			.attr("id", "window-button")
			.click(Overlay.onActionClick),
		$("<div>")
			.attr("id", "window-header")
			.append(
				$("<h2>")
					.text(name)
			),
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
	if(!options.noSpacer)
	{
		$("#window input:last-of-type").after(
			$("<div>").attr("id", "window-separator")
		);
	}

	// Call the callback function
	done();

	// Display the overlay
	$("#overlay")
		.hide()
		.removeClass("hidden")
		.fadeIn(200);

	// Clear the toast
	var Toast = require("./Toast.js");
	Toast.clear();
}

Overlay.createElement = function(data)
{
	var $element = $(data.tag);
	delete data.tag;

	if(data.attributes)
	{
		$element.attr(data.attributes);
		delete data.attributes;
	}

	for(var method in data)
		$element[method]( data[method] );

	return $element;
}

// Move an input state below the input it's linked with
Overlay.initState = function(name)
{
	$("#" + name + "-state")
		.insertAfter( $("#" + name) );
}

// Wrap a checkbox and its label, move them above separator
Overlay.initCheckbox = function(name, before)
{
	var $before = $( before || "#window-separator" );

	$("#" + name + "-agree, #" + name + "-label")
		.appendTo(
			$("<div>")
				.attr("id", name + "-container")
				.addClass("checkbox-container")
				.hide()
				.insertBefore($before)
		);
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

// Returns active radio button
Overlay.getActiveRadioButton = function()
{
	return $("#window input[type=\"radio\"]:checked");
}

// Flags an input field with an error message
Overlay.setError = function(selector, message)
{
	// Remove previous error element if it exists
	$(selector + " + .input-error").remove();

	// Add a new error element with provided message
	$(selector)
		.addClass("error")
		.after(
			$("<div>")
				.addClass("input-error")
				.toggleClass("with-state",
					$(selector).is(".with-state")
				)
				.text(message)
		);
}

// Shake all labels in the overlay
Overlay.shakeLabels = function()
{
	$("#window label")
		.stop(true, true)
		.animate({"padding-left": 15}, 100)
		.animate({"padding-left": 12}, 100)
		.animate({"padding-left": 15}, 100)
		.animate({"padding-left": 12}, 100);
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

// Hide the overlay and clear the window
Overlay.destroy = function()
{
	var Article = require("./Article.js");
	Article.destroy();

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
