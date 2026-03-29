import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function App() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <h1 className="font-display text-3xl font-bold text-primary mb-6">
        Tampa Garden
      </h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-display">Firebush</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Hamelia patens</p>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button>Add to Garden</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  )
}
