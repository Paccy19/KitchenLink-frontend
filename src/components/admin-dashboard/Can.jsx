import { useAdmin } from '../../context/AdminContext';

/** Shows its children only when the signed-in admin's role has `permission`. */
export default function Can({ permission, children, fallback = null }) {
  const { can } = useAdmin();
  return can(permission) ? children : fallback;
}
