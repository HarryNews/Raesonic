var Throttle = require("throttle-debounce/throttle");
var EmailValidator = require("email-validator");
var Overlay = require("./Overlay.js");

var Account =
{
	authenticated: false,
};

// Create a new user account
Account.create = function(username, password)
{
	$.ajax
	({
		url: "/signup/",
		type: "POST",
		data: JSON.stringify
		({
			username: username,
			password: password,
		}),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();

			var Toast = require("./Toast.js");
			Toast.show("Account created successfully", Toast.INFO);
		},
		error: function(response)
		{
			var json = response.responseJSON;

			if(!json || !json.errors)
				return;

			var error = json.errors[0];

			if(error == "username not available")
				return Overlay.setError("#signup-username", "not available");
			
			var Toast = require("./Toast.js");

			if(error == "signup disabled")
			{
				Toast.show("Account creation is disabled, please try again later",
					Toast.ERROR);

				return;
			}

			Toast.onRequestError(response);
		}
	});
}
Account.createThrottled = Throttle(5000,
function(username, password)
{
	Account.create(username, password);
});

// Login into an existing account
Account.login = function(username, password)
{
	$.ajax
	({
		url: "/login/",
		type: "POST",
		data: JSON.stringify
		({
			username: username,
			password: password,
		}),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();
		},
		error: function(response)
		{
			var json = response.responseJSON;

			if(!json || !json.errors)
				return;

			var error = json.errors[0];

			if(error == "username incorrect")
				return Overlay.setError("#login-username", "incorrect");

			if(error == "password incorrect")
				return Overlay.setError("#login-password", "incorrect");
		}
	});
}
Account.loginThrottled = Throttle(5000,
function(username, password)
{
	Account.login(username, password);
});

// Send email with a link to reset password
Account.restore = function(username)
{
	$.ajax
	({
		url: "/restore/",
		type: "POST",
		data: JSON.stringify({ username: username }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Overlay.onActionComplete("Temporarily unavailable");
			// Overlay.onActionComplete("Email sent");
		}
	});
}
Account.restoreThrottled =
Throttle(5000, function(username)
{
	Account.restore(username);
});

// Logout from the account
Account.logout = function()
{
	$.ajax
	({
		url: "/logout/",
		type: "POST",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();
		}
	});
}

// Update elements and values that depend on account status
Account.sync = function()
{
	// Obtain account details for current user
	$.ajax
	({
		url: "/own/account/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return Account.setAuthenticated(false);

			var account = response;

			Account.own =
			{
				userId: account[0],
				username: account[1],
				avatar: account[2],
				email: account[3][0],
				verified: account[3][1],
				reputation: account[4],
			};

			Account.setAuthenticated(true);
		},
		error: function()
		{
			Account.setAuthenticated(false);
		}
	});
}

// Create a new user account
Account.saveEmail = function(email)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/own/account/email/",
		type: "PUT",
		data: JSON.stringify
		({
			email: email,
		}),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.own.email = email;
			Account.own.verified = false;

			Account.updateEmailOverlay();

			Toast.show("Confirmation email has been sent, check your inbox", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Account.saveEmailThrottled = Throttle(10000,
function(email)
{
	Account.saveEmail(email);
}, true);

// Resend the confirmation email
Account.resendConfirmationEmail = function(email)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/own/account/email/resend/",
		type: "POST",
		success: function(response)
		{
			if(response.errors)
				return;

			Overlay.setAction("Email sent")

			Toast.show("Confirmation email has been re-sent, check your inbox", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}

// Set authentication state and update affected elements
Account.setAuthenticated = function(isAuthenticated)
{
	$("#user-avatar").empty();

	if(!isAuthenticated)
	{
		Account.own = null;

		$("#user-name").text("Guest");
		$("#user-details").text("log in");
	}
	else
	{
		$("#user-name").text(Account.own.username);
		$("#user-details").text("member");

		$("#user-avatar").append(
			$("<img>")
				.attr("src", Account.own.avatar)
		);
	}

	Account.authenticated = isAuthenticated;
	Account.onSync();
}

// Process the URL on init
Account.processUrl = function()
{
	var url = window.location.pathname.split("/");

	if( url[1] != "verified" )
		return;

	var Preloader = require("./Preloader.js");
	Preloader.verifiedEmail = true;
}

// Create and show an overlay for authentication
Account.showLoginOverlay = function()
{
	if( Overlay.isActive() )
		return;

	Overlay.create("Existing account",
	[{
		tag: "<input>",
		attributes:
		{
			id: "login-username",
			type: "text",
			maxlength: 30,
			placeholder: "Username",
		},
		keyup: Account.updateLoginOverlay,
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "login-password",
			type: "password",
			maxlength: 200,
			placeholder: "Password",
		},
		keyup: Account.updateLoginOverlay,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "login-confirm",
			class: "inner window-link",
		},
		text: "Log In",
		click: Account.onLoginConfirmClick,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "login-create",
			class: "window-link",
		},
		text: "Sign Up",
		click: Account.onSignUpStartClick,
	}],
	function onOverlayCreate()
	{
		Account.updateLoginOverlay();
	});
}

// Create and show an overlay for account actions
Account.showAccountOverlay = function()
{
	if( Overlay.isActive() )
		return;

	Overlay.create("Account",
	[
		// todo: change password
		{
			tag: "<div>",
			attributes:
			{
				id: "login-create",
				class: "inner window-link",
			},
			text: "Email Settings",
			click: Account.onEmailSettingsClick,
		},
		// todo: legal documents
	],
	function onOverlayCreate()
	{
		Account.updateAccountOverlay();
	});
}

// Create and show an overlay for email settings
Account.showEmailOverlay = function()
{
	Overlay.create("Email settings",
	[{
		tag: "<input>",
		attributes:
		{
			id: "email-address",
			type: "text",
			class: "with-state",
			maxlength: 254,
			placeholder: "Email",
		},
		val: Account.own.email || "",
		keyup: Account.updateEmailOverlay,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "email-address-state",
			class: "input-state",
		},
		change: Account.updateEmailOverlay,
	}],
	function onOverlayCreate()
	{
		Overlay.initState("email-address");

		Account.updateEmailOverlay();
	});
}

// Update the login overlay
Account.updateLoginOverlay = function()
{
	Overlay.clearErrors();

	var restoreAllowed =
		( $("#login-username").val().length > 2 );

	restoreAllowed
		? Overlay.setAction("Forgot password",
			Account.onRestoreClick)
		: Overlay.setAction(null);
}

// Update the sign up overlay
Account.updateSignUpOverlay = function()
{
	Overlay.clearErrors();

	var username = $("#signup-username").val();

	if( username.length > 0 && !/^[a-z0-9]+$/i.test(username) )
		Overlay.setError("#signup-username", "contains prohibited characters");
}

// Update the email settings overlay
Account.updateEmailOverlay = function()
{
	Overlay.clearErrors();

	var email = $("#email-address").val();

	var sufficientLength = ( email.length > 2 );
	var differentEmail = ( !Account.own.email || email != Account.own.email )
	var saveAllowed = ( sufficientLength && differentEmail );

	$("#email-address-state")
		.text(differentEmail
			? ( sufficientLength || !!Account.own.email )
				? "changes not saved"
				: "no email attached"
			: Account.own.verified
				? "verified"
				: "awaiting confirmation"
		)
		.toggleClass("success",
			!differentEmail && Account.own.verified
		);

	var resendAllowed = ( Account.own.email != null &&
		!Account.own.verified &&
		!differentEmail
	);

	saveAllowed
		? Overlay.setAction("Save",
			Account.onEmailSaveClick)
		: resendAllowed
			? Overlay.setAction("Resend",
				Account.onEmailResendClickThrottled)
			: Overlay.setAction(null);
}

// Update the account overlay
Account.updateAccountOverlay = function()
{
	Overlay.setAction("Logout",
		Account.onLogoutClickThrottled);
}

// Called upon clicking the user header
Account.onHeaderClick = function()
{
	if( Overlay.isActive() )
		return Overlay.destroy();

	Account.authenticated
		? Account.showAccountOverlay()
		: Account.showLoginOverlay();
}

// Called upon clicking the login button on the login screen
Account.onLoginConfirmClick = function()
{
	var username = $("#login-username").val();
	var password = $("#login-password").val();

	if(username.length < 3)
		Overlay.setError("#login-username", "incorrect");

	if(password.length < 8)
		Overlay.setError("#login-password", "incorrect");

	if( Overlay.hasErrors() )
		return;

	Account.loginThrottled(username, password);
}

// Called upon clicking the sign up button on the sign up screen
Account.onSignUpConfirmClick = function()
{
	var username = $("#signup-username").val();
	var password = $("#signup-password").val();
	var repeat = $("#signup-repeat").val();

	if(username.length < 3)
		Overlay.setError("#signup-username", "min. 3 characters");

	if( username.length > 0 && !/^[a-z0-9]+$/i.test(username) )
		Overlay.setError("#signup-username", "contains prohibited characters");

	if(password.length < 8)
		Overlay.setError("#signup-password", "min. 8 characters");

	if(repeat != password)
		Overlay.setError("#signup-repeat", "does not match");

	var agreedToTerms = $("#signup-terms-agree").is(":checked");

	if(!agreedToTerms)
	{
		Overlay.shakeLabels();
		return;
	}

	if( Overlay.hasErrors() )
		return;

	Account.createThrottled(username, password);
}

// Called upon clicking the sign up button on the login screen
// Transforms login window into a sign up window
Account.onSignUpStartClick = function()
{
	$("#window-header").text("New account");

	$("#login-username").attr("id", "signup-username");
	$("#login-password").attr("id", "signup-password");

	$("#signup-username, #signup-password")
		.unbind()
		.keyup(Account.updateSignUpOverlay);

	var $repeat = Overlay.createElement
	({
		tag: "<input>",
		attributes:
		{
			id: "signup-repeat",
			type: "password",
			maxlength: 200,
			placeholder: "Repeat Password",
		},
		keyup: Account.updateSignUpOverlay,
	});

	$("#signup-password").after( $repeat.hide() );
	$("#signup-repeat").slideDown(200);

	var $checkbox = Overlay.createElement
	({
		tag: "<input>",
		attributes:
		{
			id: "signup-terms-agree",
			type: "checkbox",
		},
	});

	var $label = Overlay.createElement
	({
		tag: "<label>",
		attributes:
		{
			id: "signup-terms-label",
			for: "signup-terms-agree",
		},
		html: "<span>I have read and agree to the</span><br>" +
			"<a href=\"#\" id=\"signup-terms-service\">Terms of Service</a> and " +
			"<a href=\"#\" id=\"signup-terms-privacy\">Privacy Policy</a>"
	});

	$("#signup-password")
		.after( $checkbox, $label );

	Overlay.initCheckbox("signup-terms");

	$("#signup-terms-container")
		.slideDown(200);

	var Article = require("./Article.js");

	Article.addLink( $("#signup-terms-service"),
		Article.TERMS_OF_SERVICE );
	Article.addLink( $("#signup-terms-privacy"),
		Article.PRIVACY_POLICY );

	$("#login-confirm").slideUp(200, function()
	{
		$(this).remove();
	});

	var $existing = Overlay.createElement
	({
		tag: "<div>",
		attributes:
		{
			id: "signup-existing",
			class: "window-link",
		},
		text: "Log In",
		click: Account.onLoginStartClick,
	});

	$("#login-create")
		.attr("id", "signup-confirm")
		.addClass("inner")
		.unbind()
		.click(Account.onSignUpConfirmClick)
		.after($existing);

	$("#signup-existing")
		.hide()
		.delay(50)
		.slideDown(200);

	Overlay.setAction(null);
	Account.updateSignUpOverlay();
}

// Called upon clicking the login button on the sign up screen
// Transforms sign up window into a login window
Account.onLoginStartClick = function()
{
	$("#window-header").text("Existing account");

	$("#signup-username").attr("id", "login-username");
	$("#signup-password").attr("id", "login-password");
	
	$("#login-username, #login-password")
		.unbind()
		.keyup(Account.updateLoginOverlay);

	$("#signup-repeat, #signup-confirm, #signup-terms-container")
		.slideUp(200,
	function()
	{
		$(this).remove();
	});

	var $create = Overlay.createElement
	({
		tag: "<div>",
		attributes:
		{
			id: "login-create",
			class: "window-link",
		},
		text: "Sign Up",
		click: Account.onSignUpStartClick,
	});

	$("#signup-existing")
		.attr("id", "login-confirm")
		.addClass("inner")
		.unbind()
		.click(Account.onLoginConfirmClick)
		.after($create);

	$("#login-create")
		.hide()
		.delay(50)
		.slideDown(200);

	Account.updateLoginOverlay();
}

// Called upon clicking the forgot password button
Account.onRestoreClick = function()
{
	var username = $("#login-username").val();
	Account.restoreThrottled(username);
}

// Called upon clicking the log out button
Account.onLogoutClick = function()
{
	Account.logout();
}
Account.onLogoutClickThrottled =
Throttle(5000, function()
{
	Account.onLogoutClick();
});

// Called upon clicking the email settings button
Account.onEmailSettingsClick = function()
{
	Overlay.destroy();
	setTimeout(Account.showEmailOverlay, 500);
}

// Called upon clicking the save email button
Account.onEmailSaveClick = function()
{
	var email = $("#email-address").val();

	if(email.length < 3)
		Overlay.setError("#email-address", "min. 3 characters");

	if( email.length > 0 && !EmailValidator.validate(email) )
		Overlay.setError("#email-address", "invalid email address");

	if( Overlay.hasErrors() )
		return;

	Account.saveEmailThrottled(email);
}

// Called upon clicking the resend email button
Account.onEmailResendClick = function()
{
	Account.resendConfirmationEmail();
}
Account.onEmailResendClickThrottled =
Throttle(120000, function()
{
	Account.onEmailResendClick();
}, true);

Account.init = function(onSync)
{
	Account.processUrl();

	Account.onSync = onSync;
	Account.sync();

	$("#header-right").click(Account.onHeaderClick);
}

module.exports = Account;
