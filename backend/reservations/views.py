from rest_framework import viewsets
from .models import Room, Reservation
from .serializers import RoomSerializer, ReservationSerializer

class RoomViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Room.objects.all().order_by('name')
    serializer_class = RoomSerializer
    pagination_class = None

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all().order_by('date', 'start_time')
    serializer_class = ReservationSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        date = self.request.query_params.get('date', None)
        if date:
            queryset = queryset.filter(date=date)
        return queryset
