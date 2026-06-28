import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { UsersIllustration } from './EmptyStateIllustrations';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'pending';
  createdAt: number;
}

interface UsersTableProps {
  filter?: string;
}

export default function UsersTable({ filter }: UsersTableProps): React.JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockUsers: User[] = [
        {
          id: 'USR001',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          createdAt: Date.now() - 7776000000,
        },
        {
          id: 'USR002',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'user',
          status: 'active',
          createdAt: Date.now() - 5184000000,
        },
        {
          id: 'USR003',
          email: 'mod@example.com',
          name: 'Moderator User',
          role: 'moderator',
          status: 'active',
          createdAt: Date.now() - 2592000000,
        },
      ];

      // Apply filter if provided
      const filteredUsers = filter
        ? mockUsers.filter(user =>
            user.email.toLowerCase().includes(filter.toLowerCase()) ||
            user.name.toLowerCase().includes(filter.toLowerCase()) ||
            user.id.toLowerCase().includes(filter.toLowerCase())
          )
        : mockUsers;

      setUsers(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'inactive':
        return 'text-gray-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'text-purple-400';
      case 'moderator':
        return 'text-blue-400';
      case 'user':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="users-table-container">
      <div className="table-header">
        <h3>Users</h3>
        <button
          onClick={fetchUsers}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="table-skeleton">
          <div className="table-row table-header-row">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="150px" />
            <Skeleton variant="text" width="150px" />
            <Skeleton variant="text" width="100px" />
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="table-row">
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="150px" />
              <Skeleton variant="text" width="150px" />
              <Skeleton variant="text" width="100px" />
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="100px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="table-error">
          <p>{error}</p>
          <button onClick={fetchUsers} className="retry-button">
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          illustration={<UsersIllustration />}
          title="No users yet"
          message="Invite team members to collaborate and manage your ProxyPay account together."
          action={{
            label: 'Invite User',
            onClick: () => console.log('Navigate to invite user'),
            variant: 'primary',
          }}
        />
      ) : (
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr className="table-header-row">
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="user-id">{user.id}</td>
                  <td className="user-name">{user.name}</td>
                  <td className="user-email">{user.email}</td>
                  <td className={clsx('user-role', getRoleColor(user.role))}>
                    {user.role}
                  </td>
                  <td className={clsx('user-status', getStatusColor(user.status))}>
                    {user.status}
                  </td>
                  <td className="user-joined">{formatTimestamp(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
