export interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

class SettingsService {
  private baseUrl = '/api/tags/settings';

  async getDefaultPhaseCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/default-phase-count`);
    if (!response.ok) {
      throw new Error('Failed to fetch default phase count');
    }
    const setting: SystemSetting = await response.json();
    return parseInt(setting.value);
  }

  async setDefaultPhaseCount(value: number): Promise<SystemSetting> {
    const response = await fetch(`${this.baseUrl}/default-phase-count`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update default phase count');
    }
    
    return response.json();
  }
}

export const settingsService = new SettingsService();
