import { NotificationsView } from "../../components/common/NotificationsView";
import { PageTransition } from "../../components/common/Misc";

export default function AdminNotifications() {
  return <PageTransition><NotificationsView admin /></PageTransition>;
}
