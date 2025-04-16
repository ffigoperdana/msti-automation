import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

class AlertService {
  async evaluateAlertRule(alertRule, currentValue) {
    const { threshold, comparison_operator } = alertRule;
    
    switch (comparison_operator) {
      case 'gt':
        return currentValue > threshold;
      case 'lt':
        return currentValue < threshold;
      case 'eq':
        return currentValue === threshold;
      case 'gte':
        return currentValue >= threshold;
      case 'lte':
        return currentValue <= threshold;
      default:
        return false;
    }
  }

  async processAlert(alertRule, metricValue) {
    try {
      const shouldTrigger = await this.evaluateAlertRule(alertRule, metricValue);
      
      if (shouldTrigger) {
        // Ambil detail contact point untuk webhook
        const alertContactPoint = await prisma.alertContactPoint.findUnique({
          where: { id: alertRule.alertContactPointId }
        });

        if (alertContactPoint && alertContactPoint.type === 'webhook') {
          await this.triggerWebhook(alertContactPoint.url, {
            alertRule,
            metricValue,
            timestamp: new Date().toISOString()
          });
        }

        // Catat alert yang terpicu ke database
        await prisma.alertHistory.create({
          data: {
            alertRuleId: alertRule.id,
            value: metricValue,
            triggered_at: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error processing alert:', error);
      throw error;
    }
  }

  async triggerWebhook(webhookUrl, payload) {
    try {
      await axios.post(webhookUrl, payload);
    } catch (error) {
      console.error('Error triggering webhook:', error);
      throw error;
    }
  }
}

export default new AlertService(); 