export const helpCategories = [
  {
    id: "asistencia",
    title: "Control de Asistencia",
    description: "Marcación de horarios, turnos y ubicación.",
    items: [
      {
        question: "¿Cómo registro mi hora de entrada y salida?",
        answer: "Ve a la sección 'Asistencia' en el menú principal. Verás un panel con la hora actual. Haz clic en el botón 'Registrar Entrada' cuando inicies tu turno, y en 'Registrar Salida' cuando termines tu jornada."
      },
      {
        question: "¿Qué significa el error 'Red o IP no autorizada' al intentar marcar asistencia?",
        answer: "Por seguridad, el sistema requiere que estés conectado a la red WiFi oficial de la Fundación o dentro de las instalaciones autorizadas para marcar tu asistencia. Si estás usando tus datos móviles o desde casa sin autorización, el sistema bloqueará el registro."
      },
      {
        question: "¿Cómo marco mis descansos o tiempo de almuerzo?",
        answer: "Durante tu jornada, si vas a tomar tu hora de almuerzo o una pausa activa, ve a la sección de Asistencia y haz clic en el botón de 'Pausa / Descanso' (ícono de taza de café). Cuando retomes tus labores, asegúrate de registrar tu regreso."
      }
    ]
  },
  {
    id: "personal",
    title: "Gestión de Personal y Roles",
    description: "Todo lo relacionado con empleados, roles y recursos humanos.",
    items: [
      {
        question: "¿Qué diferencia hay entre un Súper Administrador, Recursos Humanos y Personal Operativo?",
        answer: "➤ Súper Administrador: Tiene control total sobre el sistema, puede eliminar registros, modificar salarios y no está sujeto a horarios estrictos.\n➤ Recursos Humanos: Puede gestionar al personal, agregar nuevos empleados y ver los reportes, pero tiene algunas restricciones de seguridad.\n➤ Personal Operativo/Líderes: Solo tienen acceso a registrar su asistencia, ver sus propios datos y visualizar su carnet, sin permisos de modificación general."
      },
      {
        question: "¿Por qué mi carnet no tiene 'Turnos' asignados?",
        answer: "Los líderes de área o Súper Administradores tienen un esquema de manejo por metas o responsabilidades, por lo cual no tienen un horario de turnos estrictos impresos en el sistema como los empleados base."
      },
      {
        question: "¿Cómo genero el Carnet o el Certificado Laboral?",
        answer: "Ve a 'Directorio de Personal'. En la tabla, al final de la fila del empleado:\n\n➤ Para el Carnet: Haz clic en el botón verde con el ícono de 'Código QR'.\n➤ Para el Certificado: Haz clic en el botón con el ícono de 'Archivo de Texto'.\n\nEl sistema descargará automáticamente la imagen o PDF generado."
      },
      {
        question: "¿Cómo modifico el Salario o la Información de un empleado?",
        answer: "En la tabla de personal, haz clic en el botón amarillo con el ícono de 'Lápiz' (Editar). Modifica los campos que necesites. En el campo de 'Salario', solo escribe los números, el sistema añadirá automáticamente el formato de moneda."
      },
      {
        question: "¿Puedo cambiar el Número de Documento (NUIP) si me equivoqué?",
        answer: "Sí. Al hacer clic en 'Editar', verás el campo de Documento bloqueado por seguridad. Justo arriba dice 'Modificar NUIP'. Haz clic ahí, confirma la advertencia, y el sistema te permitirá corregir el número."
      },
      {
        question: "¿Cómo registro una amonestación o memorando?",
        answer: "Haz clic en 'Editar' sobre el empleado. Baja hasta la sección 'Anotaciones de Memorando'. Tienes tres (3) espacios disponibles. Escribe allí el motivo de la sanción. Esta etiqueta roja aparecerá bajo su nombre en la tabla principal."
      },
      {
        question: "¿Cuál es la diferencia entre el botón de Inhabilitar y el de Eliminar?",
        answer: "➤ Inhabilitar (Botón de Encendido): Bloquea el acceso del usuario al sistema, pero conserva todo su historial intacto.\n➤ Eliminar (Botón de Basura Roja): Borra permanentemente toda la información de esa persona de la base de datos. Úsalo solo si creaste el registro por error."
      }
    ]
  },
  {
    id: "afiliados",
    title: "Afiliados y Voluntarios",
    description: "Gestión de usuarios externos a la fundación.",
    items: [
      {
        question: "¿Cómo funciona la tabla de Afiliados?",
        answer: "En el menú principal verás la sección de 'Afiliados'. Allí puedes registrar nuevos participantes o voluntarios. Al igual que el personal, tienen su propio botón para descargar su Carnet de Afiliado."
      },
      {
        question: "¿Qué pasa si elimino un afiliado?",
        answer: "Al hacer clic en el ícono de basura y confirmar, el registro se borra permanentemente de la nube. Ten cuidado de no confundirlo con la opción de 'Desactivar'."
      }
    ]
  },
  {
    id: "documentos",
    title: "Documentos y Validación QR",
    description: "Administración de archivos y vencimientos.",
    items: [
      {
        question: "¿Qué significa que un documento tenga fecha 'Indefinida'?",
        answer: "Al crear un documento, puedes marcar la casilla 'Vigencia Indefinida'. Esto indica que el documento (como un Acta de Constitución) nunca caduca. Si desmarcas la casilla, el sistema exigirá una fecha de expiración."
      },
      {
        question: "¿Por qué al escanear el QR sale 'Documento Vencido'?",
        answer: "La pantalla de verificación calcula la fecha actual contra la 'Fecha de Expiración' original del documento. Si la fecha ya pasó, el código QR arrojará una alerta roja automática."
      }
    ]
  },
  {
    id: "tecnico",
    title: "Soporte Técnico y Errores",
    description: "Soluciones rápidas a problemas comunes de la plataforma.",
    items: [
      {
        question: "¿Qué hago si la pantalla se ve en blanco, sin colores o desconfigurada?",
        answer: "Esto ocurre cuando el sistema se ha actualizado pero tu navegador guardó los archivos visuales antiguos (Caché). Para solucionarlo, presiona las teclas 'Ctrl + F5' (en Windows) o 'Cmd + Shift + R' (en Mac) para forzar una recarga limpia."
      },
      {
        question: "¿Qué pasa si veo datos antiguos en la tabla después de actualizar un perfil?",
        answer: "Si eliminaste o cambiaste a alguien y aún ves el dato anterior, haz clic en el botón de 'Recargar' (ícono de flechas circulares) en la parte superior derecha de la tabla. Esto trae la información fresca de la base de datos."
      },
      {
        question: "¿Al escanear un código QR me dice 'No Encontrado' (Error 404)?",
        answer: "Si el código QR arroja este error, significa que el documento o perfil al que apuntaba fue eliminado permanentemente de la base de datos, o la dirección web fue modificada."
      },
      {
        question: "No recuerdo mi contraseña para ingresar al sistema, ¿qué hago?",
        answer: "En la pantalla de inicio de sesión (Login), haz clic en la opción '¿Olvidaste tu contraseña?'. El sistema te enviará un correo electrónico con un enlace seguro para crear una clave nueva."
      }
    ]
  }
];
