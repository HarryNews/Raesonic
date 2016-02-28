var SoundCloud = {};

SoundCloud.init = function()
{
	SC.initialize
	({
		client_id: "2f8f0d3feaba4ed1c596902b225aad55"
	});
}

module.exports = SoundCloud;
