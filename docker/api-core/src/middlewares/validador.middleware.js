export const validarTipos = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { 
            abortEarly: false, 
            stripUnknown: true, 
            convert: true 
        });

        if (error) {
            return res.status(400).json({ 
                error: "Error de validación de tipos", 
                detalles: error.details.map(d => d.message.replace(/"/g, '')) 
            });
        }
        req.body = value;
        next();
    };
};
