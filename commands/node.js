const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const GUILD_OBJETIVO_ID = '1415028934801752086'; // ID del servidor permitido
const ROLE_1_ID = '1415032127933907045'; // ID del primer rol a mencionar
const ROLE_2_ID = ''; // ID del segundo rol a mencionar

const ROLE_LIMITS_BASE = {
    caller: 1,
    coCaller: 1,
    bandera: 1,
    flame: 2,
    hwacha: 1,
    elefante: 1,
    scoute: 5,
};

const WAITLIST_MAX = 10;

const JOIN_ROLE_IDS = {
    node_join_caller: 'caller',
    node_join_coCaller: 'coCaller',
    node_join_bandera: 'bandera',
    node_join_flame: 'flame',
    node_join_hwacha: 'hwacha',
    node_join_elefante: 'elefante',
    node_join_scoute: 'scoute',
    node_join_ataque: 'ataque',
};

function getAtaqueMax(max) {
    return max === 30 ? 18 : 13;
}

function getRoleLimits(grupo) {
    return {
        ...ROLE_LIMITS_BASE,
        ataque: getAtaqueMax(grupo.max),
    };
}

function countByRole(miembros, rol) {
    return miembros.filter(m => m.rol === rol).length;
}

function findMember(grupo, userId) {
    return grupo.miembros.find(m => m.id === userId);
}

function removeFromWaitlist(grupo, userId) {
    grupo.waitlist = grupo.waitlist.filter(m => m.id !== userId);
}

function tryPromoteWaitlistToAtaque(grupo) {
    const limits = getRoleLimits(grupo);
    const ataqueCount = countByRole(grupo.miembros, 'ataque');

    if (ataqueCount >= limits.ataque) return null;
    if (!grupo.waitlist.length) return null;
    if (grupo.miembros.length >= grupo.max) return null;

    const next = grupo.waitlist.shift();
    grupo.miembros.push({ ...next, rol: 'ataque' });
    return next;
}

function formatUsers(list) {
    return list.length
        ? list.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
        : '— Sin asignar —';
}

function isMainFull(grupo) {
    return grupo.miembros.length >= grupo.max;
}

function canJoinRole(grupo, rol) {
    const limits = getRoleLimits(grupo);
    const currentCount = countByRole(grupo.miembros, rol);
    return currentCount < limits[rol];
}

function addMemberToRole(grupo, user, rol) {
    grupo.miembros.push({
        id: user.id,
        tag: user.username,
        rol
    });
}

function isUserInGrupo(grupo, userId) {
    return grupo.miembros.some(u => u.id === userId) || grupo.waitlist.some(u => u.id === userId);
}

function buildRows(grupo) {
    const limits = getRoleLimits(grupo);

    const callerCount = countByRole(grupo.miembros, 'caller');
    const coCallerCount = countByRole(grupo.miembros, 'coCaller');
    const banderaCount = countByRole(grupo.miembros, 'bandera');
    const flameCount = countByRole(grupo.miembros, 'flame');
    const hwachaCount = countByRole(grupo.miembros, 'hwacha');
    const elefanteCount = countByRole(grupo.miembros, 'elefante');
    const scouteCount = countByRole(grupo.miembros, 'scoute');
    const ataqueCount = countByRole(grupo.miembros, 'ataque');

    const mainFull = isMainFull(grupo);
    const waitlistFull = grupo.waitlist.length >= WAITLIST_MAX;

    const callerBtn = new ButtonBuilder()
        .setCustomId('node_join_caller')
        .setLabel(`Caller ${callerCount}/${limits.caller}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mainFull || callerCount >= limits.caller);

    const coCallerBtn = new ButtonBuilder()
        .setCustomId('node_join_coCaller')
        .setLabel(`Co-caller ${coCallerCount}/${limits.coCaller}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mainFull || coCallerCount >= limits.coCaller);

    const banderaBtn = new ButtonBuilder()
        .setCustomId('node_join_bandera')
        .setLabel(`Bandera ${banderaCount}/${limits.bandera}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mainFull || banderaCount >= limits.bandera);

    const flameBtn = new ButtonBuilder()
        .setCustomId('node_join_flame')
        .setLabel(`Flame ${flameCount}/${limits.flame}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(mainFull || flameCount >= limits.flame);

    const hwachaBtn = new ButtonBuilder()
        .setCustomId('node_join_hwacha')
        .setLabel(`Hwacha ${hwachaCount}/${limits.hwacha}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(mainFull || hwachaCount >= limits.hwacha);

    const elefanteBtn = new ButtonBuilder()
        .setCustomId('node_join_elefante')
        .setLabel(`Elefante ${elefanteCount}/${limits.elefante}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(mainFull || elefanteCount >= limits.elefante);

    const scouteBtn = new ButtonBuilder()
        .setCustomId('node_join_scoute')
        .setLabel(`Scoute ${scouteCount}/${limits.scoute}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(mainFull || scouteCount >= limits.scoute);

    const ataqueBtn = new ButtonBuilder()
        .setCustomId('node_join_ataque')
        .setLabel(
            ataqueCount < limits.ataque
                ? `Ataque ${ataqueCount}/${limits.ataque}`
                : `Waitlist ${grupo.waitlist.length}/${WAITLIST_MAX}`
        )
        .setStyle(ButtonStyle.Danger)
        .setDisabled(ataqueCount >= limits.ataque && waitlistFull);

    const leaveBtn = new ButtonBuilder()
        .setCustomId('node_leave')
        .setLabel('Salir')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Danger);

    const addBtn = new ButtonBuilder()
        .setCustomId('node_add')
        .setLabel('Agregar')
        .setStyle(ButtonStyle.Primary);

    const removeBtn = new ButtonBuilder()
        .setCustomId('node_remove')
        .setLabel('Eliminar')
        .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(callerBtn, coCallerBtn, banderaBtn);
    const row2 = new ActionRowBuilder().addComponents(flameBtn, hwachaBtn, elefanteBtn);
    const row3 = new ActionRowBuilder().addComponents(scouteBtn, ataqueBtn, leaveBtn);
    const row4 = new ActionRowBuilder().addComponents(addBtn, removeBtn);

    return [row1, row2, row3, row4];
}

function buildEmbed(grupo) {
    const limits = getRoleLimits(grupo);

    const caller = grupo.miembros.filter(u => u.rol === 'caller');
    const coCaller = grupo.miembros.filter(u => u.rol === 'coCaller');
    const bandera = grupo.miembros.filter(u => u.rol === 'bandera');
    const flame = grupo.miembros.filter(u => u.rol === 'flame');
    const hwacha = grupo.miembros.filter(u => u.rol === 'hwacha');
    const elefante = grupo.miembros.filter(u => u.rol === 'elefante');
    const scoute = grupo.miembros.filter(u => u.rol === 'scoute');
    const ataque = grupo.miembros.filter(u => u.rol === 'ataque');
    const sinRol = grupo.miembros.filter(u => !u.rol);

    const inscritos = grupo.miembros.length;

    return new EmbedBuilder()
        .setColor(grupo.color ?? 0x3498db)
        .setTitle('⚔️ NODE ⚔️')
        .setDescription('Usa los botones para unirte directamente a tu rol. Si Ataque está lleno, entrarás a la waitlist.')
        .addFields(
            { name: '📅 Día / Hora', value: `<t:${grupo.nodeTs}:F> (<t:${grupo.nodeTs}:t>)`, inline: true },
            { name: '⏰ Comienza en', value: `<t:${grupo.nodeTs}:R>`, inline: true },
            { name: '📌 Cupos totales', value: `${grupo.max}`, inline: false },
            { name: '🏅 Main 🏅', value: '', inline: false },
            { name: `📢 Caller (${caller.length}/${limits.caller})`, value: formatUsers(caller), inline: true },
            { name: `🎙️ Co-caller (${coCaller.length}/${limits.coCaller})`, value: formatUsers(coCaller), inline: true },
            { name: `🚩 Bandera (${bandera.length}/${limits.bandera})`, value: formatUsers(bandera), inline: true },
            { name: '🛡️ Defensa 🛡️', value: '', inline: false },
            { name: `🔥 Flame (${flame.length}/${limits.flame})`, value: formatUsers(flame), inline: true },
            { name: `🏹 Hwacha (${hwacha.length}/${limits.hwacha})`, value: formatUsers(hwacha), inline: true },
            { name: `🐘 Elefante (${elefante.length}/${limits.elefante})`, value: formatUsers(elefante), inline: true },
            { name: '⚔️ Ataque ⚔️', value: '', inline: false },
            { name: `👀 Scoute (${scoute.length}/${limits.scoute})`, value: formatUsers(scoute), inline: true },
            { name: `⚔️ Ataque (${ataque.length}/${limits.ataque})`, value: formatUsers(ataque), inline: true },
            { name: `🕓 En espera.. (${grupo.waitlist.length}/${WAITLIST_MAX})`, value: formatUsers(grupo.waitlist), inline: true },
            { name: '❓ Sin Role', value: '', inline: false },
            { name: `👤 Sin rol (${sinRol.length})`, value: formatUsers(sinRol), inline: false }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/1488221352463958112/1488221426774315018/gato_gremio.jpg?ex=69cbfdb5&is=69caac35&hm=5ce90c352c6e62b02a4936e83dec451ab44407692a8facc10fd617ac487821b2&')
        .setFooter({ text: `Inscritos: ${inscritos}/${grupo.max}` })
        .setTimestamp();
}

module.exports = {
    data: {
        name: 'node',
        description: 'Crear y manejar escuadrón de node',
        options: [
            {
                name: 'dia',
                type: 3,
                description: 'Día de la node (sin sábado)',
                required: true,
                choices: [
                    { name: 'Domingo', value: '0' },
                    { name: 'Lunes', value: '1' },
                    { name: 'Martes', value: '2' },
                    { name: 'Miércoles', value: '3' },
                    { name: 'Jueves', value: '4' },
                    { name: 'Viernes', value: '5' }
                ]
            },
            {
                name: 'cupos',
                type: 3,
                description: 'Cantidad total de cupos',
                required: true,
                choices: [
                    { name: '25 cupos', value: '25' },
                    { name: '30 cupos', value: '30' }
                ]
            }
        ],
    },

    async execute(interaction, gruposActivos, savePartys, client) {
        if (!interaction.guild || interaction.guild.id !== GUILD_OBJETIVO_ID) {
            return interaction.reply({
                content: 'Este comando solo se puede usar en el servidor autorizado.',
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
        }

        const motivo = 'Node';
        const diaStr = interaction.options.getString('dia');
        const tamano = interaction.options.getInteger('cupos');

        const color = 0x3498db;
        const creador = interaction.user;

        const diasTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const targetDow = parseInt(diaStr, 10);
        const diaNombre = diasTexto[targetDow] ?? 'Día';

        const now = new Date();
        const dowNow = now.getDay();
        let diff = (targetDow - dowNow + 7) % 7;

        if (diff === 0 && now.getHours() >= 20) diff = 7;

        const targetLocal = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + diff,
            20, 0, 0, 0
        );

        const nodeTs = Math.floor(targetLocal.getTime() / 1000);

        const grupo = {
            miembros: [],
            waitlist: [],
            motivo,
            dia: targetDow,
            diaNombre,
            nodeTs,
            creador,
            admins: ['527326979209560074', '291312809642295298'],
            mensajeId: null,
            color,
            max: tamano,
        };

        const embed = buildEmbed(grupo);
        const rows = buildRows(grupo);

        await interaction.reply({
            content: `<@&${ROLE_1_ID}>`,
            embeds: [embed],
            components: rows,
            allowedMentions: {
                roles: [ROLE_1_ID]
            }
        });

        const mensaje = await interaction.fetchReply();
        grupo.mensajeId = mensaje.id;

        gruposActivos.set(mensaje.id, grupo);
        savePartys();
    },

    async handleInteraction(interaction, gruposActivos, savePartys, client) {
        const customId = interaction.customId || '';

        function getPartyIdFromCustomId(id, prefixes) {
            if (!id) return null;
            for (const p of prefixes) {
                if (id.startsWith(p + ':')) return id.slice(p.length + 1);
            }
            return null;
        }

        function resolveGrupoFromInteraction(interaction) {
            const idFromCustom = getPartyIdFromCustomId(interaction.customId, [
                'node_add_select',
                'node_remove_select'
            ]);
            if (idFromCustom && gruposActivos.has(idFromCustom)) return gruposActivos.get(idFromCustom);
            const mid = interaction.message?.id;
            if (mid && gruposActivos.has(mid)) return gruposActivos.get(mid);
            return null;
        }

        let grupo = resolveGrupoFromInteraction(interaction);
        if (!grupo) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: 'Este escuadrón ya no está activo.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
            return;
        }

        const isOwner = interaction.user.id === grupo.creador.id || (grupo.admins && grupo.admins.includes(interaction.user.id));

        if (interaction.isButton()) {
            const user = interaction.user;

            if (JOIN_ROLE_IDS[customId]) {
                const rol = JOIN_ROLE_IDS[customId];
                const limits = getRoleLimits(grupo);

                if (isUserInGrupo(grupo, user.id)) {
                    return interaction.reply({
                        content: 'Ya estás inscrito en esta node.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                if (rol === 'ataque') {
                    const ataqueCount = countByRole(grupo.miembros, 'ataque');

                    if (ataqueCount < limits.ataque) {
                        if (isMainFull(grupo)) {
                            return interaction.reply({
                                content: 'El escuadrón principal está lleno.',
                                flags: MessageFlags.Ephemeral
                            }).catch(() => { });
                        }

                        addMemberToRole(grupo, user, 'ataque');
                        savePartys();
                        await this.renderGrupo(interaction, grupo, `${user.username} entró como Ataque.`);
                        return;
                    }

                    if (grupo.waitlist.length >= WAITLIST_MAX) {
                        return interaction.reply({
                            content: 'Ataque está lleno y la waitlist también.',
                            flags: MessageFlags.Ephemeral
                        }).catch(() => { });
                    }

                    grupo.waitlist.push({ id: user.id, tag: user.username });
                    savePartys();
                    await this.renderGrupo(interaction, grupo, `${user.username} entró a la waitlist de Ataque.`);
                    return;
                }

                if (!canJoinRole(grupo, rol)) {
                    return interaction.reply({
                        content: `El rol ${rol} ya está lleno.`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                if (isMainFull(grupo)) {
                    return interaction.reply({
                        content: 'El escuadrón principal está lleno.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                addMemberToRole(grupo, user, rol);
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} entró como ${rol}.`);
                return;
            }

            if (customId === 'node_leave') {
                const miembro = findMember(grupo, user.id);
                const enWaitlist = grupo.waitlist.some(u => u.id === user.id);

                if (!miembro && !enWaitlist) {
                    return interaction.reply({
                        content: 'No formas parte de este escuadrón.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                let promoted = null;

                if (miembro) {
                    const leavingAtaque = miembro.rol === 'ataque';
                    grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);

                    if (leavingAtaque) {
                        promoted = tryPromoteWaitlistToAtaque(grupo);
                    }
                } else {
                    removeFromWaitlist(grupo, user.id);
                }

                savePartys();
                const extra = promoted ? `\n${promoted.tag} subió automáticamente a Ataque desde la waitlist.` : '';
                await this.renderGrupo(interaction, grupo, `${user.username} salió del escuadrón.${extra}`);
                return;
            }

            if (customId === 'node_add') {
                if (!isOwner) {
                    return interaction.reply({
                        content: 'Solo el creador o administradores pueden hacer esto.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const espacio = Math.max(0, grupo.max - grupo.miembros.length);
                if (espacio === 0) {
                    return interaction.reply({
                        content: 'No hay cupos disponibles en el escuadrón principal.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`node_add_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para agregar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({
                    content: 'Elige usuarios para agregar:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }

            if (customId === 'node_remove') {
                if (!isOwner) {
                    return interaction.reply({
                        content: 'Solo el creador o administradores pueden hacer esto.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const total = grupo.miembros.length + grupo.waitlist.length;
                if (total === 0) {
                    return interaction.reply({
                        content: 'No hay usuarios para eliminar.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`node_remove_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para eliminar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(total, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({
                    content: 'Elige usuarios para eliminar:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }

        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('node_add_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo) {
                return interaction.reply({
                    content: 'Este escuadrón ya no está activo.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }

            const isOwnerNow = interaction.user.id === grupo.creador.id || (grupo.admins && grupo.admins.includes(interaction.user.id));
            if (!isOwnerNow) {
                return interaction.reply({
                    content: 'Solo el creador o administradores pueden hacer esto.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            const ids = interaction.values ?? [];

            const nuevos = ids
                .filter(id =>
                    !grupo.miembros.some(m => m.id === id) &&
                    !grupo.waitlist.some(m => m.id === id)
                )
                .slice(0, espacio);

            for (const id of nuevos) {
                const member = interaction.guild?.members?.cache?.get(id);
                const tag = member?.user?.username ?? id;
                grupo.miembros.push({ id, tag });
            }

            savePartys();
            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({
                content: `Agregados ${nuevos.length} usuario(s). Quedaron en main sin rol, así que luego puedes reasignarlos manualmente si quieres.`,
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
            return;
        }

        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('node_remove_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo) {
                return interaction.reply({
                    content: 'Este escuadrón ya no está activo.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }

            const isOwnerNow = interaction.user.id === grupo.creador.id || (grupo.admins && grupo.admins.includes(interaction.user.id));
            if (!isOwnerNow) {
                return interaction.reply({
                    content: 'Solo el creador o administradores pueden hacer esto.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const ids = interaction.values ?? [];
            let promoted = null;

            for (const id of ids) {
                const miembro = findMember(grupo, id);
                if (miembro) {
                    const leavingAtaque = miembro.rol === 'ataque';
                    grupo.miembros = grupo.miembros.filter(u => u.id !== id);

                    if (leavingAtaque && !promoted) {
                        promoted = tryPromoteWaitlistToAtaque(grupo);
                    }
                } else {
                    removeFromWaitlist(grupo, id);
                }
            }

            savePartys();
            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            const extra = promoted ? ` Además, ${promoted.tag} subió desde la waitlist a Ataque.` : '';
            await interaction.followUp({
                content: `Eliminados ${ids.length} usuario(s).${extra}`,
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
            return;
        }
    },

    async renderGrupo(interaction, grupo, msgEphemeral) {
        const embed = buildEmbed(grupo);
        const rows = buildRows(grupo);

        await interaction.message.edit({
            embeds: [embed],
            components: rows
        }).catch(() => { });

        if (msgEphemeral) {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: msgEphemeral,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: msgEphemeral,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch { }
        }
    },

    async renderGrupoFromMessageId(interaction, grupo) {
        const channel = interaction.channel;
        if (!channel) return;

        const message = await channel.messages.fetch(grupo.mensajeId).catch(() => null);
        if (!message) return;

        const embed = buildEmbed(grupo);
        const rows = buildRows(grupo);

        await message.edit({
            embeds: [embed],
            components: rows
        }).catch(() => { });
    }
};