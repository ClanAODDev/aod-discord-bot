/* jshint esversion: 11 */

const {
	SlashCommandBuilder,
	MessageFlags
} = require('discord.js');

function maskEmail(email) {
	if (!email || !email.includes('@')) {
		return 'Not set';
	}

	const [localPart, domain] = email.split('@');
	const domainParts = domain.split('.');
	const domainName = domainParts.shift() || '';
	const tld = domainParts.join('.');
	const maskedLocal = localPart.length <= 1 ? '*' : `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 1, 3))}`;
	const maskedDomain = domainName.length <= 1 ? '*' : `${domainName[0]}${'*'.repeat(Math.max(domainName.length - 1, 3))}`;
	return `${maskedLocal}@${maskedDomain}${tld ? `.${tld}` : ''}`;
}

function buildForumDataField(data) {
	return `**Username**: ${data.name}\n` +
		`**Forum ID**: ${data.id}\n` +
		`**Email**: ${maskEmail(data.email)}\n` +
		`**Primary Group**: ${data.forumGroup}\n` +
		`**Division**: ${data.division || 'Unknown'}\n` +
		`**Rank**: ${data.rank || 'Unknown'}\n` +
		`**Status**: ${data.loaStatus || 'Unknown'}\n` +
		`[[Forum Profile](https://www.clanaod.net/forums/member.php?u=${data.id})] ` +
		`[[Tracker Profile](${global.config.trackerURL}/members/${data.id})]`;
}

function buildRolesValue(guild, member) {
	let roles = member.roles.cache
		.filter(r => r != guild.roles.everyone)
		.sort((r1, r2) => r2.position - r1.position)
		.map(r => `${r}`)
		.join(', ') || 'None';
	if (roles.length > 900) {
		roles = `${roles.slice(0, 897)}...`;
	}
	return roles;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whoami')
		.setDescription('Show the basic account information known about you'),
	help: true,
	checkPerm(perm, commandName) {
		return true;
	},
	async execute(interaction, guild, member, perm) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const userData = await global.getForumInfoForMember(member, true);
		let embed = {
			title: 'Who Am I?',
			description: `Basic account information known for ${member}.`,
			thumbnail: { url: member.displayAvatarURL({ extension: 'png' }) },
			fields: [
				{
					name: 'Discord Account',
					value: `**Username**: ${global.getUsernameWithPresence(member)}\n` +
						`**Display Name**: ${member.displayName}\n` +
						`**Discord ID**: ${member.id}\n` +
						`**Joined Server**: ${member.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : 'Unknown'}`
				}
			]
		};

		if (!userData || userData.length == 0) {
			embed.fields.push({
				name: 'Forum Account',
				value: 'No forum account is currently associated with your Discord ID.'
			});
		} else {
			for (let i = 0; i < userData.length; i++) {
				embed.fields.push({
					name: userData.length == 1 ? 'Forum Account' : `Forum Account ${i + 1}`,
					value: buildForumDataField(userData[i])
				});
			}
		}

		embed.fields.push({
			name: 'Server Access',
			value: `**Permission Level**: ${global.getStringForPermission(perm)}\n` +
				`**Roles**: ${buildRolesValue(guild, member)}`
		});

		return global.ephemeralReply(interaction, { embeds: [embed] });
	},
};
