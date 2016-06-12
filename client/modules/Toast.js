var Toast =
{
	// Toast classes
	INFO: "info",
	ERROR: "error",
};

// Display a notification message on the screen
Toast.show = function(message, toastClass)
{
	$("#toast")
		.empty()
		.append(
			$("<div>")
				.attr("id", "toast-message")
				.addClass(toastClass)
				.text(message)
				.hide()
		);

	var duration = 2000 + message.length * 30;

	$("#toast-message")
		.fadeIn(200)
		.delay(duration)
		.animate
		({
			"height": 0,
			"padding-top": 0,
			"padding-bottom": 0,
			"margin-bottom": 20,
			"opacity": 0,
		},
		200,
		function onFadeOut()
		{
			$(this).remove();
		});
}

module.exports = Toast;
