import { useParams } from 'react-router'
import { PageEditor } from '@/widgets/editor'
export default function AdminPageEditPage() {
  const { id } = useParams()
  return <PageEditor key={id} id={id} />
}
