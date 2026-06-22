UPDATE roles
SET name = 'IT_SERVICE_MANAGER',
    description = 'Oversees IT service operations, queues, escalations, assignments, and reporting'
WHERE name = 'MANAGER';

INSERT INTO assignment_group_members (assignment_group_id, user_id)
SELECT g.id, u.id
FROM assignment_groups g
JOIN users u ON u.organization_id = g.organization_id
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'IT_SERVICE_MANAGER'
ON CONFLICT DO NOTHING;
