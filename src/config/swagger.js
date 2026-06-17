import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const port = process.env.PORT || 3001
const docsDir = join(__dirname, '../../docs')

const swaggerDocument = YAML.load(join(docsDir, 'swagger.yaml'))

swaggerDocument.components.schemas = YAML.load(join(docsDir, 'components/schemas.yaml'))

const pathFiles = ['auth', 'users', 'banks', 'accounts', 'transactions']
swaggerDocument.paths = pathFiles.reduce(
  (paths, name) => ({ ...paths, ...YAML.load(join(docsDir, `paths/${name}.yaml`)) }),
  {},
)

swaggerDocument.servers = [
  {
    url: `http://localhost:${port}/api`,
    description: 'Serveur de développement',
  },
]

export const swaggerServe = swaggerUi.serve
export const swaggerSetup = swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Banking API Docs',
  swaggerOptions: {
    persistAuthorization: true,
  },
})