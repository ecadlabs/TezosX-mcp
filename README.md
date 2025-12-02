# TezosX MCP

## Frontend

The frontend can be found in /frontend. It's a simple web interface that lets the user deploy a spending contract, manage spending limits, and control their spending key.

Upon startup of the users model interface (ie, Claude Desktop), the web interface is run locally on the users device at http://localhost:13205. The port can be changed by adding the `WEB_PORT` environment variable to your platforms MCP config.