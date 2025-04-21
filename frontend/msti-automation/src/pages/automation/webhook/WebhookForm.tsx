import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Tipe untuk data webhook
interface WebhookDetails {
  name: string;
  description: string;
  port: number;
  endpoint: string;
  ansibleScript: string;
  nodeOptions: string;
  environmentVariables: string;
  code: string;
}

// Data dummy untuk webhook yang sudah ada (untuk mode edit)
const MOCK_WEBHOOK_DETAILS: Record<string, WebhookDetails> = {
  '1': {
    name: 'Alert Handler',
    description: 'Handles alert notifications and triggers Ansible script',
    port: 5000,
    endpoint: '/webhook',
    ansibleScript: '1', // ID untuk ansible script
    nodeOptions: '--max-old-space-size=256',
    environmentVariables: 'NODE_ENV=production\nPATH=/home/cisco/.local/bin:$PATH',
    code: `const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  try {
    console.log('Webhook received:', req.body);

    // Extract alert details
    const alertName = req.body.alerts?.[0]?.labels?.alertname || 'unknown';
    const downCount = req.body.alerts?.[0]?.annotations?.value || 'unknown';
    const status = req.body.alerts?.[0]?.status || 'unknown'; // Pending/Firing

    console.log(\`Alert triggered: \${alertName}, Down Count: \${downCount}, Status: \${status}\`);

    // Verify if the alert is firing (to avoid handling resolved alerts unnecessarily)
    if (status === 'firing') {
      const bashCmd = \`/bin/bash /home/cisco/run_ansible.sh "\${alertName}" "\${downCount}"\`;
      
      const env = {
        ...process.env,
        PATH: \`\${process.env.PATH}:/home/cisco/.local/bin\`
      };

      exec(bashCmd, { env }, (error, stdout, stderr) => {
        console.log('--- DEBUG START ---');
        console.log('Command:', bashCmd);
        console.log('Error:', error);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        console.log('--- DEBUG END ---');
  
        if (error) {
          console.error(\`Error running script: \${error.message}\`);
          return res.status(500).send(\`Error: \${error.message}\\n\${stderr}\`);
        }
        res.status(200).send(stdout);
      });
    } else {
      console.log('Alert is not firing, no action taken.');
      res.status(200).send('No action taken.');
    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
    res.status(400).send('Invalid JSON payload');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Webhook server listening on port \${port}\`);
});`
  }
};

// Data dummy untuk ansible script yang tersedia
const MOCK_ANSIBLE_SCRIPTS = [
  { id: '1', name: 'Server Restart', path: '/home/cisco/run_ansible.sh' },
  { id: '2', name: 'Backup Process', path: '/home/cisco/backup.sh' },
  { id: '3', name: 'Cleanup Script', path: '/home/cisco/cleanup.sh' }
];

const WebhookForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  // State untuk form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [port, setPort] = useState<number>(5000);
  const [endpoint, setEndpoint] = useState('/webhook');
  const [ansibleScript, setAnsibleScript] = useState('');
  const [nodeOptions, setNodeOptions] = useState('');
  const [environmentVariables, setEnvironmentVariables] = useState('');
  const [code, setCode] = useState(`const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  try {
    console.log('Webhook received:', req.body);

    // Extract data from payload
    // TODO: Customize based on your needs
    
    // Execute Ansible script
    const bashCmd = '/path/to/your/script.sh';
    
    exec(bashCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(\`Error running script: \${error.message}\`);
        return res.status(500).send(\`Error: \${error.message}\\n\${stderr}\`);
      }
      res.status(200).send(stdout);
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).send('Invalid payload');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Webhook server listening on port \${port}\`);
});`);

  // Load existing data untuk mode edit
  useEffect(() => {
    if (isEditMode && id && MOCK_WEBHOOK_DETAILS[id]) {
      const webhook = MOCK_WEBHOOK_DETAILS[id];
      setName(webhook.name);
      setDescription(webhook.description);
      setPort(webhook.port);
      setEndpoint(webhook.endpoint);
      setAnsibleScript(webhook.ansibleScript);
      setNodeOptions(webhook.nodeOptions);
      setEnvironmentVariables(webhook.environmentVariables);
      setCode(webhook.code);
    }
  }, [isEditMode, id]);

  // Update port di template kode
  useEffect(() => {
    setCode(prevCode => 
      prevCode.replace(/const port = \d+;/, `const port = ${port};`)
    );
  }, [port]);

  // Update endpoint di template kode
  useEffect(() => {
    setCode(prevCode => {
      // Cari endpoint yang ada di kode
      const currentEndpoint = prevCode.match(/app\.post\('([^']+)'/)?.[1] || '/webhook';
      // Ganti dengan endpoint baru
      return prevCode.replace(
        new RegExp(`app\\.post\\('${currentEndpoint}'`, 'g'),
        `app.post('${endpoint}'`
      );
    });
  }, [endpoint]);

  // Handler untuk submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulasi pengiriman data ke API
    const webhookData = {
      id: id || Date.now().toString(),
      name,
      description,
      port,
      endpoint,
      ansibleScript,
      nodeOptions,
      environmentVariables,
      code
    };
    
    console.log('Saving webhook:', webhookData);
    
    // Redirect kembali ke daftar webhook
    navigate('/automation/webhook');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Webhook' : 'Create New Webhook'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode 
            ? 'Update webhook configuration and code' 
            : 'Configure a new webhook to respond to external events'}
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Basic Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Alert Handler"
              />
            </div>
            
            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                Port <span className="text-red-500">*</span>
              </label>
              <input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
                required
                min="1024"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="5000"
              />
              <p className="mt-1 text-xs text-gray-500">Use ports above 1024 to avoid system reserved ports</p>
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe webhook purpose and functionality"
            />
          </div>
          
          <div>
            <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                http://your-server:{port}
              </span>
              <input
                id="endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                required
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="/webhook"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Full URL will be <code>http://your-server:{port}{endpoint}</code></p>
          </div>
        </div>
        
        {/* Ansible Integration */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Ansible Integration</h2>
          
          <div>
            <label htmlFor="ansibleScript" className="block text-sm font-medium text-gray-700 mb-1">
              Ansible Script
            </label>
            <select
              id="ansibleScript"
              value={ansibleScript}
              onChange={(e) => setAnsibleScript(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Ansible Script --</option>
              {MOCK_ANSIBLE_SCRIPTS.map(script => (
                <option key={script.id} value={script.id}>
                  {script.name} ({script.path})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Select an Ansible script to run when webhook is triggered</p>
          </div>
        </div>
        
        {/* Advanced Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Advanced Settings</h2>
          
          <div>
            <label htmlFor="nodeOptions" className="block text-sm font-medium text-gray-700 mb-1">
              Node.js Options
            </label>
            <input
              id="nodeOptions"
              type="text"
              value={nodeOptions}
              onChange={(e) => setNodeOptions(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="--max-old-space-size=256"
            />
            <p className="mt-1 text-xs text-gray-500">Additional Node.js options for running this webhook</p>
          </div>
          
          <div>
            <label htmlFor="envVars" className="block text-sm font-medium text-gray-700 mb-1">
              Environment Variables
            </label>
            <textarea
              id="envVars"
              value={environmentVariables}
              onChange={(e) => setEnvironmentVariables(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="NODE_ENV=production
PATH=/home/user/.local/bin:$PATH"
            />
            <p className="mt-1 text-xs text-gray-500">
              One environment variable per line in <code>KEY=VALUE</code> format
            </p>
          </div>
        </div>
        
        {/* Webhook Code */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Webhook Code</h2>
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              JavaScript Code <span className="text-red-500">*</span>
            </label>
            <textarea
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Customize this Node.js Express code to handle your webhook logic. 
              The port and endpoint in the code will be updated to match your settings above.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/automation/webhook')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isEditMode ? 'Update Webhook' : 'Create Webhook'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WebhookForm; 