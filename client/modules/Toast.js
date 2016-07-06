var Toast =
{
	ERRORS:
	{
		"internal error":
			"Error has occurred, please try again later",
		"not enough reputation":
			"Not enough reputation to proceed. Sorry!",
		"exceeded daily activity limit":
			"Daily activity limit exceeded, please try again later",
		"email not available":
			"Email is already in use on another account",
		"email already verified":
			"Email is already verified, please refresh the page"
	},
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

// Called upon a request error
Toast.onRequestError = function(response)
{
	var json = response.responseJSON;

	if(!json || !json.errors)
		return;

	var error = json.errors[0];

	if(error == "not authenticated")
	{
		Toast.show("Session has expired, please log in and try again",
			Toast.ERROR);

		setTimeout(function()
		{
			var Account = require("./Account.js");
			Account.sync();
		}, 3000);

		return;
	}

	if(error == "email not verified")
	{
		var Overlay = require("./Overlay.js");
		Overlay.destroy();

		Toast.show("Verified email is required to proceed, " +
			"please review the settings", Toast.ERROR);

		setTimeout(function()
		{
			var Account = require("./Account.js");
			Account.showEmailOverlay();
		}, 3000);

		return;
	}

	for(var errorId in Toast.ERRORS)
	{
		if(error == errorId)
		{
			Toast.show(Toast.ERRORS[errorId], Toast.ERROR);
			return;
		}
	}
}

// Remove the notification message
Toast.clear = function()
{
	$("#toast-message").remove();
}

module.exports = Toast;
