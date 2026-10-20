/**
 * Error message translations for ProxyPay API
 * Supports: English, Spanish, French
 */

export type ErrorLocale = 'en' | 'es' | 'fr';

/**
 * HTTP status code messages
 */
export const httpStatusMessages: Record<ErrorLocale, Record<number, string>> = {
  en: {
    // 4xx Client Errors
    400: 'Bad Request - The server cannot process your request due to client error',
    401: 'Unauthorized - Authentication required or invalid credentials',
    403: 'Forbidden - You do not have permission to access this resource',
    404: 'Not Found - The requested resource does not exist',
    405: 'Method Not Allowed - This HTTP method is not supported for this endpoint',
    408: 'Request Timeout - The request took too long to complete',
    409: 'Conflict - The request conflicts with the current state of the resource',
    410: 'Gone - The requested resource is permanently unavailable',
    412: 'Precondition Failed - A required condition in the request header failed',
    413: 'Payload Too Large - The request body exceeds the maximum allowed size',
    414: 'URI Too Long - The request URL exceeds the maximum allowed length',
    415: 'Unsupported Media Type - The request content type is not supported',
    416: 'Range Not Satisfiable - The requested range cannot be satisfied',
    417: 'Expectation Failed - The server cannot fulfill the expectation in the request',
    418: 'I\'m a teapot - Unexpected response from the server',
    422: 'Unprocessable Entity - The request is well-formed but contains semantic errors',
    429: 'Too Many Requests - Rate limit exceeded. Please wait before retrying',
    // 5xx Server Errors
    500: 'Internal Server Error - An unexpected error occurred on the server',
    501: 'Not Implemented - The requested functionality is not implemented',
    502: 'Bad Gateway - Invalid response from an upstream server',
    503: 'Service Unavailable - The server is temporarily unable to handle the request',
    504: 'Gateway Timeout - The upstream server did not respond in time',
    505: 'HTTP Version Not Supported - The HTTP version used is not supported',
  },
  es: {
    // 4xx Client Errors
    400: 'Solicitud Incorrecta - El servidor no puede procesar tu solicitud debido a un error del cliente',
    401: 'No Autorizado - Se requiere autenticación o las credenciales son inválidas',
    403: 'Prohibido - No tienes permiso para acceder a este recurso',
    404: 'No Encontrado - El recurso solicitado no existe',
    405: 'Método No Permitido - Este método HTTP no es compatible con este endpoint',
    408: 'Tiempo de Solicitud Agotado - La solicitud tardó demasiado en completarse',
    409: 'Conflicto - La solicitud entra en conflicto con el estado actual del recurso',
    410: 'Desaparecido - El recurso solicitado no está disponible permanentemente',
    412: 'Precondición Fallida - Una condición requerida en el encabezado de la solicitud falló',
    413: 'Carga Útil Demasiado Grande - El cuerpo de la solicitud excede el tamaño máximo permitido',
    414: 'URL Demasiado Largo - La URL de la solicitud excede la longitud máxima permitida',
    415: 'Tipo de Contenido No Compatible - El tipo de contenido de la solicitud no es compatible',
    416: 'Rango No Satisfacible - El rango solicitado no se puede satisfacer',
    417: 'Expectativa Fallida - El servidor no puede cumplir la expectativa de la solicitud',
    418: 'Soy una tetera - Respuesta inesperada del servidor',
    422: 'Entidad No Procesable - La solicitud está bien formada pero contiene errores semánticos',
    429: 'Demasiadas Solicitudes - Límite de velocidad excedido. Por favor espera antes de reintentar',
    // 5xx Server Errors
    500: 'Error Interno del Servidor - Ocurrió un error inesperado en el servidor',
    501: 'No Implementado - La funcionalidad solicitada no está implementada',
    502: 'Puerta de Enlace Incorrecta - Respuesta inválida de un servidor ascendente',
    503: 'Servicio No Disponible - El servidor no puede manejar la solicitud temporalmente',
    504: 'Tiempo de Puerta de Enlace Agotado - El servidor ascendente no respondió a tiempo',
    505: 'Versión HTTP No Admitida - La versión HTTP utilizada no es compatible',
  },
  fr: {
    // 4xx Client Errors
    400: 'Mauvaise Requête - Le serveur ne peut pas traiter votre demande en raison d\'une erreur client',
    401: 'Non Autorisé - Authentification requise ou identifiants invalides',
    403: 'Interdit - Vous n\'avez pas la permission d\'accéder à cette ressource',
    404: 'Non Trouvé - La ressource demandée n\'existe pas',
    405: 'Méthode Non Autorisée - Cette méthode HTTP n\'est pas prise en charge pour ce endpoint',
    408: 'Délai d\'Expiration de la Requête - La requête a pris trop de temps pour se terminer',
    409: 'Conflit - La demande entre en conflit avec l\'état actuel de la ressource',
    410: 'Disparu - La ressource demandée est définitivement indisponible',
    412: 'Précondition Échouée - Une condition requise dans l\'en-tête de la requête a échoué',
    413: 'Charge Utile Trop Grande - Le corps de la requête dépasse la taille maximale autorisée',
    414: 'URL Trop Long - L\'URL de la requête dépasse la longueur maximale autorisée',
    415: 'Type de Contenu Non Pris en Charge - Le type de contenu de la requête n\'est pas pris en charge',
    416: 'Plage Non Satisfaisable - La plage demandée ne peut pas être satisfaite',
    417: 'Attente Échouée - Le serveur ne peut pas satisfaire l\'attente de la requête',
    418: 'Je suis une théière - Réponse inattendue du serveur',
    422: 'Entité Non Traitable - La requête est bien formée mais contient des erreurs sémantiques',
    429: 'Trop de Requêtes - Limite de débit dépassée. Veuillez attendre avant de réessayer',
    // 5xx Server Errors
    500: 'Erreur Interne du Serveur - Une erreur inattendue s\'est produite sur le serveur',
    501: 'Non Implémenté - La fonctionnalité demandée n\'est pas implémentée',
    502: 'Mauvaise Passerelle - Réponse invalide d\'un serveur en amont',
    503: 'Service Indisponible - Le serveur ne peut pas traiter la requête temporairement',
    504: 'Délai d\'Expiration de la Passerelle - Le serveur en amont n\'a pas répondu à temps',
    505: 'Version HTTP Non Prise en Charge - La version HTTP utilisée n\'est pas prise en charge',
  },
};

/**
 * Common API error messages by code/type
 */
export const apiErrorMessages: Record<ErrorLocale, Record<string, string>> = {
  en: {
    // Network errors
    'NETWORK_ERROR': 'Network Error - Unable to connect to the server. Check your internet connection',
    'TIMEOUT': 'Request Timeout - The server did not respond in time. Please try again',
    'FETCH_FAILED': 'Fetch Failed - Unable to retrieve data from the server',
    
    // Authentication/Authorization
    'INVALID_TOKEN': 'Invalid Token - Your authentication token is invalid or expired. Please log in again',
    'EXPIRED_TOKEN': 'Expired Token - Your session has expired. Please log in again',
    'MISSING_CREDENTIALS': 'Missing Credentials - Authentication credentials are required',
    'INSUFFICIENT_PERMISSIONS': 'Insufficient Permissions - Your account does not have the required permissions',
    'INVALID_API_KEY': 'Invalid API Key - The provided API key is invalid or disabled',
    
    // Validation errors
    'INVALID_REQUEST_BODY': 'Invalid Request - The request body contains invalid data',
    'MISSING_REQUIRED_FIELD': 'Missing Required Field - One or more required fields are missing',
    'INVALID_PARAMETER': 'Invalid Parameter - A request parameter has an invalid value',
    'INVALID_JSON': 'Invalid JSON - The request body is not valid JSON',
    'VALIDATION_FAILED': 'Validation Failed - The request data failed validation',
    
    // Resource errors
    'RESOURCE_NOT_FOUND': 'Resource Not Found - The requested resource does not exist',
    'RESOURCE_ALREADY_EXISTS': 'Resource Already Exists - A resource with this identifier already exists',
    'RESOURCE_DELETED': 'Resource Deleted - The requested resource has been deleted',
    
    // Transaction specific
    'INVALID_AMOUNT': 'Invalid Amount - The transaction amount is invalid',
    'INSUFFICIENT_BALANCE': 'Insufficient Balance - The account does not have enough balance for this transaction',
    'TRANSACTION_FAILED': 'Transaction Failed - The transaction could not be completed',
    'TRANSACTION_DECLINED': 'Transaction Declined - The payment provider declined this transaction',
    'TRANSACTION_TIMEOUT': 'Transaction Timeout - The transaction took too long to process',
    'DUPLICATE_TRANSACTION': 'Duplicate Transaction - A transaction with this ID already exists',
    
    // Rate limiting
    'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded - Too many requests. Please wait before trying again',
    'QUOTA_EXCEEDED': 'Quota Exceeded - You have exceeded your usage quota',
    
    // Server errors
    'SERVER_ERROR': 'Server Error - An unexpected error occurred',
    'SERVICE_UNAVAILABLE': 'Service Unavailable - The service is temporarily unavailable',
    'MAINTENANCE': 'Maintenance - The service is under maintenance. Please try again later',
    'INTERNAL_ERROR': 'Internal Error - An internal server error occurred',
    
    // Unknown
    'UNKNOWN_ERROR': 'Unknown Error - An unexpected error occurred. Please try again',
  },
  es: {
    // Network errors
    'NETWORK_ERROR': 'Error de Red - No se puede conectar al servidor. Verifica tu conexión a Internet',
    'TIMEOUT': 'Tiempo de Solicitud Agotado - El servidor no respondió a tiempo. Por favor intenta de nuevo',
    'FETCH_FAILED': 'Error al Obtener - No se pueden recuperar datos del servidor',
    
    // Authentication/Authorization
    'INVALID_TOKEN': 'Token Inválido - Tu token de autenticación es inválido o ha expirado. Por favor inicia sesión de nuevo',
    'EXPIRED_TOKEN': 'Token Expirado - Tu sesión ha expirado. Por favor inicia sesión de nuevo',
    'MISSING_CREDENTIALS': 'Credenciales Faltantes - Se requieren credenciales de autenticación',
    'INSUFFICIENT_PERMISSIONS': 'Permisos Insuficientes - Tu cuenta no tiene los permisos requeridos',
    'INVALID_API_KEY': 'Clave API Inválida - La clave API proporcionada es inválida o está deshabilitada',
    
    // Validation errors
    'INVALID_REQUEST_BODY': 'Solicitud Inválida - El cuerpo de la solicitud contiene datos inválidos',
    'MISSING_REQUIRED_FIELD': 'Campo Requerido Faltante - Faltan uno o más campos requeridos',
    'INVALID_PARAMETER': 'Parámetro Inválido - Un parámetro de solicitud tiene un valor inválido',
    'INVALID_JSON': 'JSON Inválido - El cuerpo de la solicitud no es un JSON válido',
    'VALIDATION_FAILED': 'Validación Fallida - Los datos de la solicitud no pasaron la validación',
    
    // Resource errors
    'RESOURCE_NOT_FOUND': 'Recurso No Encontrado - El recurso solicitado no existe',
    'RESOURCE_ALREADY_EXISTS': 'Recurso Ya Existe - Un recurso con este identificador ya existe',
    'RESOURCE_DELETED': 'Recurso Eliminado - El recurso solicitado ha sido eliminado',
    
    // Transaction specific
    'INVALID_AMOUNT': 'Cantidad Inválida - La cantidad de la transacción es inválida',
    'INSUFFICIENT_BALANCE': 'Saldo Insuficiente - La cuenta no tiene saldo suficiente para esta transacción',
    'TRANSACTION_FAILED': 'Transacción Fallida - La transacción no se pudo completar',
    'TRANSACTION_DECLINED': 'Transacción Rechazada - El proveedor de pagos rechazó esta transacción',
    'TRANSACTION_TIMEOUT': 'Tiempo de Transacción Agotado - La transacción tardó demasiado en procesarse',
    'DUPLICATE_TRANSACTION': 'Transacción Duplicada - Una transacción con este ID ya existe',
    
    // Rate limiting
    'RATE_LIMIT_EXCEEDED': 'Límite de Velocidad Excedido - Demasiadas solicitudes. Por favor espera antes de intentar de nuevo',
    'QUOTA_EXCEEDED': 'Cuota Excedida - Has excedido tu cuota de uso',
    
    // Server errors
    'SERVER_ERROR': 'Error del Servidor - Ocurrió un error inesperado',
    'SERVICE_UNAVAILABLE': 'Servicio No Disponible - El servicio no está disponible temporalmente',
    'MAINTENANCE': 'Mantenimiento - El servicio está en mantenimiento. Por favor intenta más tarde',
    'INTERNAL_ERROR': 'Error Interno - Ocurrió un error interno del servidor',
    
    // Unknown
    'UNKNOWN_ERROR': 'Error Desconocido - Ocurrió un error inesperado. Por favor intenta de nuevo',
  },
  fr: {
    // Network errors
    'NETWORK_ERROR': 'Erreur Réseau - Impossible de se connecter au serveur. Vérifiez votre connexion Internet',
    'TIMEOUT': 'Délai d\'Expiration de la Requête - Le serveur n\'a pas répondu à temps. Veuillez réessayer',
    'FETCH_FAILED': 'Récupération Échouée - Impossible de récupérer les données du serveur',
    
    // Authentication/Authorization
    'INVALID_TOKEN': 'Jeton Invalide - Votre jeton d\'authentification est invalide ou a expiré. Veuillez vous reconnecter',
    'EXPIRED_TOKEN': 'Jeton Expiré - Votre session a expiré. Veuillez vous reconnecter',
    'MISSING_CREDENTIALS': 'Identifiants Manquants - Les identifiants d\'authentification sont requis',
    'INSUFFICIENT_PERMISSIONS': 'Permissions Insuffisantes - Votre compte n\'a pas les permissions requises',
    'INVALID_API_KEY': 'Clé API Invalide - La clé API fournie est invalide ou désactivée',
    
    // Validation errors
    'INVALID_REQUEST_BODY': 'Requête Invalide - Le corps de la requête contient des données invalides',
    'MISSING_REQUIRED_FIELD': 'Champ Obligatoire Manquant - Un ou plusieurs champs obligatoires sont manquants',
    'INVALID_PARAMETER': 'Paramètre Invalide - Un paramètre de requête a une valeur invalide',
    'INVALID_JSON': 'JSON Invalide - Le corps de la requête n\'est pas un JSON valide',
    'VALIDATION_FAILED': 'Validation Échouée - Les données de la requête n\'ont pas passé la validation',
    
    // Resource errors
    'RESOURCE_NOT_FOUND': 'Ressource Non Trouvée - La ressource demandée n\'existe pas',
    'RESOURCE_ALREADY_EXISTS': 'La Ressource Existe Déjà - Une ressource avec cet identifiant existe déjà',
    'RESOURCE_DELETED': 'Ressource Supprimée - La ressource demandée a été supprimée',
    
    // Transaction specific
    'INVALID_AMOUNT': 'Montant Invalide - Le montant de la transaction est invalide',
    'INSUFFICIENT_BALANCE': 'Solde Insuffisant - Le compte n\'a pas assez de solde pour cette transaction',
    'TRANSACTION_FAILED': 'Échec de la Transaction - La transaction n\'a pas pu être complétée',
    'TRANSACTION_DECLINED': 'Transaction Refusée - Le fournisseur de paiement a refusé cette transaction',
    'TRANSACTION_TIMEOUT': 'Délai d\'Expiration de la Transaction - La transaction a pris trop de temps à traiter',
    'DUPLICATE_TRANSACTION': 'Transaction en Double - Une transaction avec cet ID existe déjà',
    
    // Rate limiting
    'RATE_LIMIT_EXCEEDED': 'Limite de Débit Dépassée - Trop de requêtes. Veuillez attendre avant de réessayer',
    'QUOTA_EXCEEDED': 'Quota Dépassé - Vous avez dépassé votre quota d\'utilisation',
    
    // Server errors
    'SERVER_ERROR': 'Erreur du Serveur - Une erreur inattendue s\'est produite',
    'SERVICE_UNAVAILABLE': 'Service Indisponible - Le service est temporairement indisponible',
    'MAINTENANCE': 'Maintenance - Le service est en maintenance. Veuillez réessayer plus tard',
    'INTERNAL_ERROR': 'Erreur Interne - Une erreur interne du serveur s\'est produite',
    
    // Unknown
    'UNKNOWN_ERROR': 'Erreur Inconnue - Une erreur inattendue s\'est produite. Veuillez réessayer',
  },
};

/**
 * Additional context messages for error details
 */
export const errorContextMessages: Record<ErrorLocale, Record<string, string>> = {
  en: {
    'retry_hint': 'Please try again',
    'contact_support': 'Please contact support',
    'check_connection': 'Please check your internet connection',
    'try_again_later': 'Please try again later',
    'contact_support_code': 'If the problem persists, please contact support with error code',
  },
  es: {
    'retry_hint': 'Por favor intenta de nuevo',
    'contact_support': 'Por favor contacta con soporte',
    'check_connection': 'Por favor verifica tu conexión a Internet',
    'try_again_later': 'Por favor intenta más tarde',
    'contact_support_code': 'Si el problema persiste, por favor contacta con soporte con el código de error',
  },
  fr: {
    'retry_hint': 'Veuillez réessayer',
    'contact_support': 'Veuillez contacter le support',
    'check_connection': 'Veuillez vérifier votre connexion Internet',
    'try_again_later': 'Veuillez réessayer plus tard',
    'contact_support_code': 'Si le problème persiste, veuillez contacter le support avec le code d\'erreur',
  },
};
