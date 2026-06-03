import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MyLearningPanel from '@/components/university/MyLearningPanel';

const MyLearning = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/corp/university')}><ArrowLeft className="h-4 w-4" /></Button>
      </div>
      <MyLearningPanel courseHrefBase="/corp/university" />
    </div>
  );
};

export default MyLearning;
