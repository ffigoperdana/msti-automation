import api from './api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

interface CreateUserData {
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface UpdateUserData {
  email?: string;
  password?: string;
  role?: 'admin' | 'editor' | 'viewer';
}

class UserService {
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data.users;
  }

  async getUser(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.user;
  }

  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/users', data);
    return response.data.user;
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data.user;
  }

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}

export default new UserService();
