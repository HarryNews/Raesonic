var Account = {};

// Create a new user account
Account.create = function(nickname, password)
{
	$.ajax
	({
		url: "/signup/",
		type: "POST",
		data: JSON.stringify({ nickname: nickname, password: password }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			
		}
	});
}

module.exports = Account;
