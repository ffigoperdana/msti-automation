import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

class AnsibleService {
  constructor() {
    this.playbookDirectory = process.env.ANSIBLE_PLAYBOOK_DIR || './ansible/playbooks';
  }

  async executePlaybook(playbookId, variables = {}) {
    try {
      // Ambil detail playbook dari database
      const playbook = await prisma.ansiblePlaybook.findUnique({
        where: { id: playbookId },
        include: {
          ansibleConfig: true
        }
      });

      if (!playbook) {
        throw new Error('Playbook not found');
      }

      // Buat file inventory sementara jika diperlukan
      const inventoryPath = await this.createTemporaryInventory(playbook.ansibleConfig);

      // Siapkan variabel untuk playbook
      const varsFile = await this.createVarsFile(variables);

      // Jalankan playbook
      const command = `ansible-playbook ${playbook.playbook_file} -i ${inventoryPath} --extra-vars "@${varsFile}"`;
      
      const { stdout, stderr } = await execAsync(command);

      // Catat eksekusi ke database
      await prisma.playbookExecution.create({
        data: {
          playbookId: playbookId,
          status: stderr ? 'failed' : 'success',
          output: stdout,
          error: stderr,
          executed_at: new Date()
        }
      });

      // Bersihkan file sementara
      await this.cleanup(inventoryPath, varsFile);

      return {
        success: !stderr,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      console.error('Error executing playbook:', error);
      throw error;
    }
  }

  async createTemporaryInventory(config) {
    const inventoryContent = this.generateInventoryContent(config);
    const inventoryPath = path.join(this.playbookDirectory, 'temp_inventory.ini');
    await fs.writeFile(inventoryPath, inventoryContent);
    return inventoryPath;
  }

  async createVarsFile(variables) {
    const varsPath = path.join(this.playbookDirectory, 'temp_vars.yml');
    await fs.writeFile(varsPath, JSON.stringify(variables, null, 2));
    return varsPath;
  }

  generateInventoryContent(config) {
    // Implementasi sesuai dengan format inventory Ansible
    return `[servers]
${config.hosts.join('\n')}

[servers:vars]
ansible_user=${config.ansible_user}
ansible_ssh_private_key_file=${config.ssh_key_path}
`;
  }

  async cleanup(...files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.error(`Error cleaning up file ${file}:`, error);
      }
    }
  }
}

export default new AnsibleService(); 