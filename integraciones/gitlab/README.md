# Integración Gitlab:
Para realizar la Integración de gitlab hay que seguir los siguientes pasos:
1. Generación del token de gitlab.
2. Scopes asociados necesarios. 
## Scopes y generación:
Para la generación debes ir a `user_settings/personal_access_tokens` y seleccionar los siguientes scopes: 
- `api`: Permite que el token interactúe con la API. 
- `admin_mode`: Para permitir la creación y eliminación de usuarios.
- `read_user, read_api, read_repository`: Lectura de los usuarios.

Montaje del gitlab:
```bash
docker run --detach \
  --hostname localhost \
  --publish 1010:1010 --publish 2222:22 \
  --name gitlab \
  --restart always \
  --volume gitlab_config:/etc/gitlab \
  --volume gitlab_logs:/var/log/gitlab \
  --volume gitlab_data:/var/opt/gitlab \
  --shm-size 256m \
  --env GITLAB_OMNIBUS_CONFIG="external_url 'http://localhost:1010'; nginx['listen_port'] = 1010" \
  gitlab/gitlab-ee:18.6.3-ee.0

```
