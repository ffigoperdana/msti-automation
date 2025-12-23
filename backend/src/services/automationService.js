import { PrismaClient } from '@prisma/client';
import ansibleService from './ansibleService.js';

const prisma = new PrismaClient();

class AutomationService {
  async handleWebhook(payload) {
    try {
      const { alertRule, metricValue } = payload;

      // Cari automation rule yang terkait dengan alert
      const automationRule = await prisma.automationRule.findFirst({
        where: {
          alertRuleId: alertRule.id,
          enabled: true
        },
        include: {
          ansiblePlaybook: true
        }
      });

      if (!automationRule) {
        console.log('No automation rule found for this alert');
        return;
      }

      // Siapkan variabel untuk playbook
      const variables = {
        alert_rule: alertRule,
        metric_value: metricValue,
        threshold: alertRule.threshold,
        timestamp: new Date().toISOString(),
        ...automationRule.variables // Variabel tambahan yang dikonfigurasi di automation rule
      };

      // Jalankan playbook Ansible
      const result = await ansibleService.executePlaybook(
        automationRule.ansiblePlaybook.id,
        variables
      );

      // Catat eksekusi automation
      await prisma.automationExecution.create({
        data: {
          automationRuleId: automationRule.id,
          alertRuleId: alertRule.id,
          status: result.success ? 'success' : 'failed',
          output: result.output,
          error: result.error,
          executed_at: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  async createAutomationRule(data) {
    try {
      const automationRule = await prisma.automationRule.create({
        data: {
          name: data.name,
          description: data.description,
          alertRuleId: data.alertRuleId,
          ansiblePlaybookId: data.ansiblePlaybookId,
          variables: data.variables || {},
          enabled: data.enabled || true
        }
      });

      return automationRule;
    } catch (error) {
      console.error('Error creating automation rule:', error);
      throw error;
    }
  }

  async getAutomationRules(filters = {}) {
    try {
      const rules = await prisma.automationRule.findMany({
        where: filters,
        include: {
          alertRule: true,
          ansiblePlaybook: true
        }
      });

      return rules;
    } catch (error) {
      console.error('Error fetching automation rules, coba tes:', error);
      throw error;
    }
  }
}

export default new AutomationService(); 