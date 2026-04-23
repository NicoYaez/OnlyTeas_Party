const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();


const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [
  // /party
  new SlashCommandBuilder()
    .setName('party')
    .setDescription('Crea un grupo de hasta 5 personas'),

  new SlashCommandBuilder()
    .setName('config-party')
    .setDescription('Configurar roles a pingear al crear una party (por servidor)'),

  // /party
  new SlashCommandBuilder()
    .setName('miru')
    .setDescription('Crear party Mirumok Dekia'),

  new SlashCommandBuilder()
    .setName('altar')
    .setDescription('Crear party Altar de Sangre'),

  new SlashCommandBuilder()
    .setName('gyfin')
    .setDescription('Crear party Gyfin Dekia'),

  // /anuncio
  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Crear un anuncio'),

  // /cupon
  new SlashCommandBuilder()
    .setName('cupon')
    .setDescription('Publica un cupon con reacciones')
    .addStringOption(opt =>
      opt.setName('codigo')
        .setDescription('Código a publicar')
        .setRequired(true)
    ),
  // /liga
  new SlashCommandBuilder()
    .setName('liga')
    .setDescription('Escuadron liga de gremios')
    .addStringOption(opt =>
      opt.setName('dia')
        .setDescription('Dia de la node (sin sabado)')
        .setRequired(true)
        .addChoices(
          { name: 'Domingo', value: '0' },
          { name: 'Lunes', value: '1' },
          { name: 'Martes', value: '2' },
          { name: 'Miercoles', value: '3' },
          { name: 'Jueves', value: '4' },
          { name: 'Viernes', value: '5' }
        ))
    .addStringOption(opt =>
      opt.setName('hora')
        .setDescription('Hora de inicio (HH:mm, Ej: 21:00)')
        .setRequired(true)
    ),

  // Node
  new SlashCommandBuilder()
    .setName('node')
    .setDescription('Crear party Node War')
    .addStringOption(opt =>
      opt
        .setName('dia')
        .setDescription('Día de la node (sin sábado)')
        .setRequired(true)
        .addChoices(
          { name: 'Domingo', value: '0' },
          { name: 'Lunes', value: '1' },
          { name: 'Martes', value: '2' },
          { name: 'Miércoles', value: '3' },
          { name: 'Jueves', value: '4' },
          { name: 'Viernes', value: '5' }
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('cupos')
        .setDescription('Cantidad total de cupos')
        .setRequired(true)
        .addChoices(
          { name: '25 cupos', value: 25 },
          { name: '30 cupos', value: 30 }
        )
    ),

  // /maritima
  new SlashCommandBuilder()
    .setName('maritima')
    .setDescription('Escuadron maritimo BDO (21:00 BRT fijo)')
    .addStringOption(opt =>
      opt.setName('dia')
        .setDescription('Dia de la node (sin sabado)')
        .setRequired(true)
        .addChoices(
          { name: 'Domingo', value: '0' },
          { name: 'Lunes', value: '1' },
          { name: 'Martes', value: '2' },
          { name: 'Miercoles', value: '3' },
          { name: 'Jueves', value: '4' },
          { name: 'Viernes', value: '5' }
        )
    ),

  // /aviso-node ← NUEVO
  new SlashCommandBuilder()
    .setName('aviso-node')
    .setDescription('Aviso de cupos para Node War')
    .addStringOption(opt =>
      opt.setName('dia')
        .setDescription('Día del aviso (sin sábado)')
        .setRequired(true)
        .addChoices(
          { name: 'Domingo', value: '0' },
          { name: 'Lunes', value: '1' },
          { name: 'Martes', value: '2' },
          { name: 'Miércoles', value: '3' },
          { name: 'Jueves', value: '4' },
          { name: 'Viernes', value: '5' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('cupo')
        .setDescription('Cupo disponible')
        .setRequired(true)
        .addChoices(
          { name: '25', value: 25 },
          { name: '30', value: 30 }
        )
    ),

  // /boses ← NUEVO
  new SlashCommandBuilder()
    .setName('boses')
    .setDescription('Muestra cuenta regresiva bosses (día actual + hora fija)'),

  // /config-boses ← NUEVO
  new SlashCommandBuilder()
    .setName('config-boses')
    .setDescription('Configurar HORA fija de bosses (HH:mm)'),

].map(cmd => cmd.toJSON());

async function main() {
  if (!token || !clientId || !guildId) {
    console.error('Faltan variables: token, clientId o guildId.');
    process.exit(1);
  }


  const rest = new REST({ version: '10' }).setToken(token);


  try {
    console.log('Registrando comandos de aplicación (guild)...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Comandos actualizados correctamente (incluyendo /boses y /config-boses).');
  } catch (err) {
    console.error('❌ Error actualizando comandos:', err?.rawError ?? err);
    process.exit(1);
  }
}


main();