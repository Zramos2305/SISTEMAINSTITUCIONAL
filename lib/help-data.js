export const helpCategories = [
  {
    id: "personal",
    title: "Gestión de Personal",
    description: "Todo lo relacionado con empleados y recursos humanos.",
    items: [
      {
        question: "¿Cómo genero el Carnet o el Certificado de un empleado?",
        answer: "Ve al menú 'Personal'. Busca al empleado en la tabla y haz clic en el botón con el ícono de 'Carnet' o 'Certificado' que aparece a la derecha de su nombre. El sistema descargará automáticamente la imagen lista para imprimir."
      },
      {
        question: "¿Qué pasa si me equivoco al escribir el salario o los datos?",
        answer: "No te preocupes. Solo tienes que hacer clic en el botón de 'Editar' (el ícono del lápiz verde) junto al nombre de la persona en la tabla. Ahí podrás corregir cualquier error y guardar los cambios."
      },
      {
        question: "¿Cuál es la diferencia entre 'Desactivar' y 'Eliminar'?",
        answer: "➤ **Desactivar:** Se usa cuando un empleado deja de trabajar en la Fundación. El registro no se borra, solo se oculta temporalmente por si vuelve a ser contratado en el futuro.\n\n➤ **Eliminar:** Borra permanente e irreversiblemente todo el historial de esa persona. Solo úsalo si creaste un perfil por error."
      },
      {
        question: "¿Cómo le agrego una amonestación o memorando a alguien?",
        answer: "Haz clic en 'Editar' sobre el empleado. En la ventana emergente, busca la sección 'Memorandos'. Puedes añadir hasta tres (3) anotaciones. Recuerda escribir la fecha y el motivo de forma clara."
      }
    ]
  },
  {
    id: "documentos",
    title: "Gestión de Documentos",
    description: "Creación y administración de documentos institucionales.",
    items: [
      {
        question: "¿Cómo subo un nuevo documento al sistema?",
        answer: "Ve a la sección 'Documentos' en el menú. Haz clic en el botón superior que dice 'Crear Nuevo Documento', llena la información básica (título, autor, fechas) y adjunta el archivo en formato PDF si es necesario."
      },
      {
        question: "¿Qué significa que un documento tenga vigencia 'Indefinida'?",
        answer: "Significa que el documento nunca caduca (como un acta de fundación o un reglamento permanente). Si el documento sí tiene fecha de vencimiento (como un contrato), asegúrate de desmarcar la casilla 'Indefinida' y elegir la fecha límite."
      }
    ]
  },
  {
    id: "afiliados",
    title: "Afiliados y Voluntarios",
    description: "Registro de participantes externos a la Fundación.",
    items: [
      {
        question: "¿Cómo registro a un nuevo afiliado?",
        answer: "Ve a la sección 'Afiliados'. Haz clic en 'Registrar Afiliado'. Tendrás que llenar sus datos personales, información de contacto, e indicar si es activo o inactivo al momento de inscribirlo."
      },
      {
        question: "¿Dónde puedo ver el QR de un afiliado?",
        answer: "El sistema genera el código QR automáticamente. Para verlo, genera su carnet o haz clic en el botón 'Ver Detalles' (ícono del ojo) en la tabla de afiliados."
      }
    ]
  },
  {
    id: "seguridad",
    title: "Seguridad y Accesos",
    description: "Usuarios, contraseñas y permisos del sistema.",
    items: [
      {
        question: "¿Por qué me dice 'Acceso Denegado' al intentar entrar a una sección?",
        answer: "El sistema protege información sensible. Si no tienes el rol adecuado (por ejemplo, si no eres de Recursos Humanos), el sistema no te dejará ver o editar la nómina o al personal. Solicita acceso al Administrador Principal."
      },
      {
        question: "¿Cómo restablezco mi contraseña si la olvidé?",
        answer: "En la pantalla inicial de Inicio de Sesión, haz clic en '¿Olvidaste tu contraseña?'. El sistema enviará un correo a tu cuenta registrada con un enlace seguro para crear una clave nueva."
      }
    ]
  }
];
