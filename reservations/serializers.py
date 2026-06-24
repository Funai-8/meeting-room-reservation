from rest_framework import serializers
from .models import Room, Reservation

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity']

class ReservationSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    startTime = serializers.TimeField(source='start_time')
    endTime = serializers.TimeField(source='end_time')

    class Meta:
        model = Reservation
        fields = ['id', 'room', 'room_name', 'name', 'date', 'startTime', 'endTime', 'attendees', 'created_at']

    def validate(self, data):
        room = data.get('room')
        attendees = data.get('attendees')
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        # 1. End time must be after start time
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError("End time must be after start time.")

        # 2. Attendees vs Room capacity
        if room and attendees and attendees > room.capacity:
            raise serializers.ValidationError(
                f"{room.name} only fits {room.capacity} people. You entered {attendees}."
            )

        # 3. No overlapping reservation for the same room and date
        if room and date and start_time and end_time:
            # Overlap condition: existing.start_time < new.end_time AND new.start_time < existing.end_time
            overlapping_query = Reservation.objects.filter(
                room=room,
                date=date,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            # Exclude current instance in case of update
            if self.instance:
                overlapping_query = overlapping_query.exclude(pk=self.instance.pk)
                
            if overlapping_query.exists():
                raise serializers.ValidationError(
                    f"{room.name} is already booked during that time. Please choose another slot."
                )

        return data
