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

		var $element = $(data.tag);

		$element.attr
		({
			id: data.id,
			type: data.type,
			maxlength: data.maxlength,
			placeholder: data.placeholder,
		});

		if(typeof data.value != "undefined")
			$element.val(data.value);

		if(typeof data.keyup == "function")
			$element.keyup(data.keyup);

		$elements.push($element);
	}

	// Add elements to the window
	$("#window")
		.empty()
		.append($elements);

	// Call the callback function
	done();

	// Display the overlay
	$("#overlay")
		.hide()
		.removeClass("hidden")
		.fadeIn(200);
}

// Changes the button text and configures the click action
Overlay.setAction = function(name, onClick)
{
	$("#window-button").text(name || "");
	Overlay.action = onClick;
}

// Returns true if the overlay is in use
Overlay.isActive = function()
{
	return !$("#overlay").is(".hidden");
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
