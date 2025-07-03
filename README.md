# Plataforma de Vendas

Plataforma Embalagens Conceito é uma Progressive Web App que integra treinamento, CRM e gamificação para a equipe de vendas. A aplicação utiliza Firebase Authentication, Firestore e Storage, além de recursos de PWA para funcionamento offline e notificações.

## Setup do Projeto
1. Clone o repositório
2. Execute `npm install` para instalar as dependências
3. Execute `npm test` para rodar os testes

### Para GitHub Codex
Se estiver usando o GitHub Codex, execute primeiro:
```bash
npm install
## Recursos principais
- Autenticação de usuários e gerenciamento de perfis
- Dashboard com módulos de treinamento (Academia)
- Sistema de gamificação com ranking e conquistas
- Módulo CRM para acompanhamento de prospects e vendas
- Suporte offline e notificações push via service worker
- Layout responsivo com opção de tema escuro

## Configuração do Firebase
1. Copie `config.example.js` para `config.js`.
2. Preencha `config.js` com as credenciais reais do seu projeto Firebase.
3. Mantenha `config.js` no mesmo diretório de `index.html` para que seja carregado automaticamente.
4. Não versionar `config.js` (já incluído no `.gitignore`).

## Executando localmente
1. Instale as dependências (necessário apenas para testes):
   ```bash
   npm install
   ```
2. Sirva os arquivos em um servidor local para que o service worker funcione corretamente. Exemplo com `http-server`:
   ```bash
   npx http-server -c-1 .
   ```
3. Acesse `http://localhost:8080` (porta padrão) em seu navegador.

## Build para produção
O projeto é estático e não requer etapa de compilação. Para disponibilizar em produção:
1. Copie todos os arquivos do repositório e seu `config.js` para um serviço de hospedagem estática (ex.: Firebase Hosting).
2. Opcionalmente, execute `firebase deploy` se utilizar o Firebase Hosting.

## Contribuindo
Contribuições são bem-vindas! Para propor melhorias ou correções:
1. Faça um fork do repositório e crie um branch para sua alteração.
2. Realize as modificações desejadas e verifique se `npm test` executa sem erros.
3. Abra um Pull Request descrevendo suas mudanças.

Relate problemas ou sugestões abrindo uma issue.
